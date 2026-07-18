const { poolPromise, sql } = require('../config/db');

class AssignmentModel {
  static async getPersonnel(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId).query(`
      SELECT c.id collaboratorId, c.employeeCode, c.documentNumber, c.firstName,
        c.lastName, c.photoPath, p.code positionCode, p.name positionName,
        currentAssignment.id assignmentId, currentAssignment.clientId,
        currentAssignment.siteId, currentAssignment.areaId, currentAssignment.shiftId,
        currentAssignment.workTableId, currentAssignment.startDate,
        COALESCE(client.tradeName, client.businessName) clientName,
        site.name siteName, area.name areaName, shift.name shiftName,
        wt.name workTableName,
        CONVERT(varchar(5), shift.startTime, 108) shiftStart,
        CONVERT(varchar(5), shift.endTime, 108) shiftEnd,
        assignmentSummary.assignmentCount, assignmentSummary.assignmentSummary
      FROM dbo.Collaborators c
      INNER JOIN dbo.Positions p ON p.id = c.positionId
      OUTER APPLY (
        SELECT TOP 1 item.* FROM dbo.CollaboratorAssignments item
        WHERE item.collaboratorId = c.id AND item.endDate IS NULL AND item.estado = 1
        ORDER BY item.startDate DESC, item.id DESC
      ) currentAssignment
      LEFT JOIN dbo.Clients client ON client.id = currentAssignment.clientId
      LEFT JOIN dbo.Sites site ON site.id = currentAssignment.siteId
      LEFT JOIN dbo.Areas area ON area.id = currentAssignment.areaId
      LEFT JOIN dbo.Shifts shift ON shift.id = currentAssignment.shiftId
      LEFT JOIN dbo.WorkTables wt ON wt.id = currentAssignment.workTableId
      OUTER APPLY (
        SELECT COUNT(*) assignmentCount,
          STRING_AGG(CONCAT(COALESCE(cl.tradeName, cl.businessName), N' / ', s.name, N' / ', COALESCE(ar.name, N'Sin area'), N' / ', sh.name), N' | ') assignmentSummary
        FROM dbo.CollaboratorAssignments active
        INNER JOIN dbo.Clients cl ON cl.id = active.clientId
        INNER JOIN dbo.Sites s ON s.id = active.siteId
        LEFT JOIN dbo.Areas ar ON ar.id = active.areaId
        INNER JOIN dbo.Shifts sh ON sh.id = active.shiftId
        WHERE active.collaboratorId = c.id AND active.endDate IS NULL AND active.estado = 1
      ) assignmentSummary
      WHERE c.companyId = @companyId AND c.estado = 1
        AND p.code IN (N'operario', N'supervisor')
      ORDER BY p.name, c.lastName, c.firstName
    `);
    return result.recordset;
  }

  static async getHistory(collaboratorId, companyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('collaboratorId', sql.Int, collaboratorId)
      .input('companyId', sql.Int, companyId).query(`
        SELECT a.id, a.startDate, a.endDate,
          COALESCE(c.tradeName, c.businessName) clientName,
          s.name siteName, ar.name areaName, sh.name shiftName,
          wt.name workTableName, u.name assignedByName
        FROM dbo.CollaboratorAssignments a
        INNER JOIN dbo.Clients c ON c.id = a.clientId
        INNER JOIN dbo.Sites s ON s.id = a.siteId
        LEFT JOIN dbo.Areas ar ON ar.id = a.areaId
        INNER JOIN dbo.Shifts sh ON sh.id = a.shiftId
        LEFT JOIN dbo.WorkTables wt ON wt.id = a.workTableId
        INNER JOIN dbo.Users u ON u.id = a.assignedBy
        WHERE a.collaboratorId = @collaboratorId AND a.companyId = @companyId
        ORDER BY a.startDate DESC, a.id DESC
      `);
    return result.recordset;
  }

  static async assignMany(data, companyId, assignedBy) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    try {
      const created = [];
      for (const collaboratorId of data.collaboratorIds) {
        const replaceAll = data.replaceExistingIds.includes(collaboratorId);
        await new sql.Request(transaction)
          .input('collaboratorId', sql.Int, collaboratorId)
          .input('companyId', sql.Int, companyId)
          .input('siteId', sql.Int, data.siteId)
          .input('areaId', sql.Int, data.areaId || null)
          .input('shiftId', sql.Int, data.shiftId)
          .input('startDate', sql.Date, data.startDate)
          .input('replaceAll', sql.Bit, replaceAll)
          .query(`
            UPDATE dbo.CollaboratorAssignments
            SET endDate = @startDate, estado = 0
            WHERE collaboratorId = @collaboratorId AND companyId = @companyId
              AND endDate IS NULL AND estado = 1
              AND (@replaceAll = 1 OR (siteId = @siteId AND (areaId = @areaId OR (areaId IS NULL AND @areaId IS NULL)) AND shiftId = @shiftId))
          `);
        const result = await new sql.Request(transaction)
          .input('companyId', sql.Int, companyId)
          .input('collaboratorId', sql.Int, collaboratorId)
          .input('clientId', sql.Int, data.clientId)
          .input('siteId', sql.Int, data.siteId)
          .input('areaId', sql.Int, data.areaId || null)
          .input('shiftId', sql.Int, data.shiftId)
          .input('startDate', sql.Date, data.startDate)
          .input('notes', sql.NVarChar(500), data.notes || null)
          .input('assignedBy', sql.Int, assignedBy)
          .query(`
            INSERT dbo.CollaboratorAssignments
              (companyId, collaboratorId, clientId, siteId, areaId, shiftId, startDate, notes, assignedBy)
            OUTPUT INSERTED.id
            VALUES (@companyId, @collaboratorId, @clientId, @siteId, @areaId, @shiftId, @startDate, @notes, @assignedBy)
          `);
        created.push(result.recordset[0]);
      }
      await transaction.commit();
      return created;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  static async endAssignment(id, companyId, endDate) {
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId).input('endDate', sql.Date, endDate)
      .query(`
        UPDATE dbo.CollaboratorAssignments
        SET endDate = @endDate, estado = 0
        OUTPUT INSERTED.id
        WHERE id = @id AND companyId = @companyId AND endDate IS NULL AND estado = 1
      `);
    return result.recordset[0];
  }

  static async listWorkTables(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId).query(`
      SELECT wt.*, COALESCE(c.tradeName,c.businessName) clientName, s.name siteName, a.name areaName
      FROM dbo.WorkTables wt
      INNER JOIN dbo.Clients c ON c.id = wt.clientId
      INNER JOIN dbo.Sites s ON s.id = wt.siteId
      LEFT JOIN dbo.Areas a ON a.id = wt.areaId
      WHERE wt.companyId = @companyId
      ORDER BY s.name, a.name, wt.name
    `);
    return result.recordset;
  }

  static async getWorkTableBoard(companyId, user, filters = {}) {
    const pool = await poolPromise;
    const request = pool.request()
      .input('companyId', sql.Int, companyId)
      .input('userId', sql.Int, user.id)
      .input('workDate', sql.Date, filters.workDate || null)
      .input('shiftId', sql.Int, filters.shiftId ? Number(filters.shiftId) : null)
      .input('siteId', sql.Int, filters.siteId ? Number(filters.siteId) : null);
    const scopeFilter = user.role === 'supervisor'
      ? `AND EXISTS (
          SELECT 1
          FROM dbo.CollaboratorAssignments sup
          INNER JOIN dbo.Collaborators sc ON sc.id = sup.collaboratorId
          WHERE sc.userId = @userId AND sup.companyId = @companyId AND sup.estado = 1 AND sup.endDate IS NULL
            AND sup.siteId = a.siteId AND sup.shiftId = a.shiftId
            AND (@workDate IS NULL OR sup.startDate <= @workDate)
        )`
      : '';
    const result = await request.query(`
      SELECT a.id assignmentId, a.collaboratorId, a.clientId, a.siteId, a.areaId, a.shiftId,
        CASE WHEN d.id IS NOT NULL THEN d.workTableId ELSE a.workTableId END workTableId,
        d.id dailyAssignmentId, d.assignedAt dailyAssignedAt,
        COALESCE(cl.tradeName, cl.businessName) clientName, s.name siteName, ar.name areaName, sh.name shiftName,
        wt.name workTableName, c.employeeCode, c.documentNumber, c.firstName, c.lastName, c.photoPath,
        ast.code attendanceStatusCode, ast.name attendanceStatusName,
        p.code positionCode, p.name positionName
      FROM dbo.CollaboratorAssignments a
      INNER JOIN dbo.Collaborators c ON c.id = a.collaboratorId
      INNER JOIN dbo.Positions p ON p.id = c.positionId
      INNER JOIN dbo.Clients cl ON cl.id = a.clientId
      INNER JOIN dbo.Sites s ON s.id = a.siteId
      LEFT JOIN dbo.Areas ar ON ar.id = a.areaId
      INNER JOIN dbo.Shifts sh ON sh.id = a.shiftId
      LEFT JOIN dbo.WorkTableDailyAssignments d ON d.companyId = a.companyId
        AND d.assignmentId = a.id
        AND d.collaboratorId = a.collaboratorId
        AND d.shiftId = a.shiftId
        AND d.estado = 1
        AND d.workDate = @workDate
      LEFT JOIN dbo.WorkTables wt ON wt.id = CASE WHEN d.id IS NOT NULL THEN d.workTableId ELSE a.workTableId END
      LEFT JOIN dbo.AttendanceSheets ats ON ats.companyId = a.companyId
        AND ats.attendanceDate = @workDate AND ats.clientId = a.clientId AND ats.siteId = a.siteId
        AND ats.areaId = a.areaId AND ats.shiftId = a.shiftId
      LEFT JOIN dbo.AttendanceExpected ae ON ae.sheetId = ats.id AND ae.collaboratorId = a.collaboratorId
      LEFT JOIN dbo.AttendanceStatuses ast ON ast.id = ae.attendanceStatusId
      WHERE a.companyId = @companyId AND a.estado = 1 AND a.endDate IS NULL
        AND c.estado = 1 AND p.code = N'operario'
        AND (@workDate IS NULL OR (a.startDate <= @workDate AND (a.endDate IS NULL OR a.endDate >= @workDate)))
        AND (@shiftId IS NULL OR a.shiftId = @shiftId)
        AND (@siteId IS NULL OR a.siteId = @siteId)
        ${scopeFilter}
      ORDER BY s.name, ar.name, sh.name, wt.name, c.lastName, c.firstName
    `);
    return result.recordset;
  }

  static async assignWorkTable(data, companyId, userId) {
    const pool = await poolPromise;
    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const ids = data.assignmentIds;
      for (const assignmentId of ids) {
        await new sql.Request(tx)
          .input('assignmentId', sql.Int, assignmentId)
          .input('companyId', sql.Int, companyId)
          .input('workTableId', sql.Int, data.workTableId || null)
          .input('workDate', sql.Date, data.workDate)
          .input('shiftId', sql.Int, data.shiftId)
          .input('userId', sql.Int, userId)
          .input('reason', sql.NVarChar(500), data.reason || null)
          .query(`
            DECLARE @collaboratorId INT, @clientId INT, @siteId INT, @areaId INT, @previousWorkTableId INT, @dailyAssignmentId BIGINT;
            SELECT @collaboratorId = a.collaboratorId, @clientId = a.clientId, @siteId = a.siteId, @areaId = a.areaId,
              @previousWorkTableId = CASE WHEN d.id IS NOT NULL THEN d.workTableId ELSE a.workTableId END, @dailyAssignmentId = d.id
            FROM dbo.CollaboratorAssignments a
            LEFT JOIN dbo.WorkTableDailyAssignments d ON d.companyId = a.companyId
              AND d.assignmentId = a.id AND d.collaboratorId = a.collaboratorId
              AND d.workDate = @workDate AND d.shiftId = @shiftId AND d.estado = 1
            WHERE a.id = @assignmentId AND a.companyId = @companyId AND a.estado = 1 AND a.endDate IS NULL;

            IF @collaboratorId IS NOT NULL
            BEGIN
              IF @dailyAssignmentId IS NULL
              BEGIN
                INSERT dbo.WorkTableDailyAssignments(companyId,workDate,clientId,siteId,areaId,shiftId,workTableId,collaboratorId,assignmentId,assignedBy,reason)
                VALUES(@companyId,@workDate,@clientId,@siteId,@areaId,@shiftId,@workTableId,@collaboratorId,@assignmentId,@userId,@reason);
                SET @dailyAssignmentId = SCOPE_IDENTITY();
              END
              ELSE
              BEGIN
                UPDATE dbo.WorkTableDailyAssignments
                SET workTableId = @workTableId, assignedBy = @userId, assignedAt = SYSUTCDATETIME(), reason = @reason, updatedAt = SYSUTCDATETIME()
                WHERE id = @dailyAssignmentId;
              END

              INSERT dbo.WorkTableMovements(companyId, collaboratorId, assignmentId, previousWorkTableId, newWorkTableId, movedBy, reason, workDate, shiftId, dailyAssignmentId)
              VALUES(@companyId, @collaboratorId, @assignmentId, @previousWorkTableId, @workTableId, @userId, @reason, @workDate, @shiftId, @dailyAssignmentId);
            END
          `);
      }
      await tx.commit();
      return { assigned: ids.length };
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  static async getWorkTableDailyReport(companyId, user, filters = {}) {
    const pool = await poolPromise;
    const request = pool.request()
      .input('companyId', sql.Int, companyId)
      .input('userId', sql.Int, user.id)
      .input('from', sql.Date, filters.from || filters.workDate || null)
      .input('to', sql.Date, filters.to || filters.workDate || null)
      .input('siteId', sql.Int, filters.siteId ? Number(filters.siteId) : null)
      .input('shiftId', sql.Int, filters.shiftId ? Number(filters.shiftId) : null)
      .input('workTableId', sql.Int, filters.workTableId ? Number(filters.workTableId) : null)
      .input('q', sql.NVarChar(120), filters.q ? `%${String(filters.q).trim()}%` : null);
    const scopeFilter = user.role === 'supervisor'
      ? `AND EXISTS (
          SELECT 1
          FROM dbo.CollaboratorAssignments sup
          INNER JOIN dbo.Collaborators sc ON sc.id = sup.collaboratorId
          WHERE sc.userId = @userId AND sup.companyId = @companyId AND sup.estado = 1 AND sup.endDate IS NULL
            AND sup.siteId = d.siteId AND sup.shiftId = d.shiftId
            AND sup.startDate <= d.workDate
        )`
      : '';
    const result = await request.query(`
      SELECT d.id, d.workDate, d.assignedAt, d.reason, d.estado,
        COALESCE(cl.tradeName, cl.businessName) clientName,
        s.name siteName, ar.name areaName, sh.name shiftName,
        wt.name workTableName,
        c.employeeCode, c.documentNumber, c.firstName, c.lastName,
        u.name assignedByName,
        ast.code attendanceStatusCode, ast.name attendanceStatusName
      FROM dbo.WorkTableDailyAssignments d
      INNER JOIN dbo.Clients cl ON cl.id = d.clientId
      INNER JOIN dbo.Sites s ON s.id = d.siteId
      LEFT JOIN dbo.Areas ar ON ar.id = d.areaId
      INNER JOIN dbo.Shifts sh ON sh.id = d.shiftId
      LEFT JOIN dbo.WorkTables wt ON wt.id = d.workTableId
      INNER JOIN dbo.Collaborators c ON c.id = d.collaboratorId
      INNER JOIN dbo.Users u ON u.id = d.assignedBy
      LEFT JOIN dbo.AttendanceSheets ats ON ats.companyId = d.companyId
        AND ats.attendanceDate = d.workDate AND ats.clientId = d.clientId AND ats.siteId = d.siteId
        AND ats.areaId = d.areaId AND ats.shiftId = d.shiftId
      LEFT JOIN dbo.AttendanceExpected ae ON ae.sheetId = ats.id AND ae.collaboratorId = d.collaboratorId
      LEFT JOIN dbo.AttendanceStatuses ast ON ast.id = ae.attendanceStatusId
      WHERE d.companyId = @companyId AND d.estado = 1
        AND (@from IS NULL OR d.workDate >= @from)
        AND (@to IS NULL OR d.workDate <= @to)
        AND (@siteId IS NULL OR d.siteId = @siteId)
        AND (@shiftId IS NULL OR d.shiftId = @shiftId)
        AND (@workTableId IS NULL OR d.workTableId = @workTableId)
        AND (
          @q IS NULL OR c.documentNumber LIKE @q OR c.employeeCode LIKE @q
          OR c.firstName LIKE @q OR c.lastName LIKE @q OR wt.name LIKE @q
        )
        ${scopeFilter}
      ORDER BY d.workDate DESC, s.name, sh.name, wt.name, c.lastName, c.firstName
    `);
    return result.recordset;
  }

  static async getWorkTableMovements(companyId, collaboratorId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('collaboratorId', sql.Int, collaboratorId)
      .query(`
        SELECT m.*, prev.name previousWorkTableName, next.name newWorkTableName, sh.name shiftName, u.name movedByName
        FROM dbo.WorkTableMovements m
        LEFT JOIN dbo.WorkTables prev ON prev.id = m.previousWorkTableId
        LEFT JOIN dbo.WorkTables next ON next.id = m.newWorkTableId
        LEFT JOIN dbo.Shifts sh ON sh.id = m.shiftId
        INNER JOIN dbo.Users u ON u.id = m.movedBy
        WHERE m.companyId = @companyId AND m.collaboratorId = @collaboratorId
        ORDER BY m.movedAt DESC, m.id DESC
      `);
    return result.recordset;
  }

  static async createWorkTable(data, companyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('clientId', sql.Int, data.clientId)
      .input('siteId', sql.Int, data.siteId)
      .input('areaId', sql.Int, data.areaId || null)
      .input('code', sql.NVarChar(30), data.code)
      .input('name', sql.NVarChar(120), data.name)
      .input('description', sql.NVarChar(250), data.description || null)
      .query(`
        INSERT dbo.WorkTables(companyId,clientId,siteId,areaId,code,name,description)
        OUTPUT INSERTED.*
        VALUES(@companyId,@clientId,@siteId,@areaId,@code,@name,@description)
      `);
    return result.recordset[0];
  }

  static async getWorkTable(id, companyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .query('SELECT * FROM dbo.WorkTables WHERE id=@id AND companyId=@companyId AND estado=1');
    return result.recordset[0];
  }
}

module.exports = AssignmentModel;
