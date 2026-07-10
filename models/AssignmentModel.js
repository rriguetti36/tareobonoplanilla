const { poolPromise, sql } = require('../config/db');

class AssignmentModel {
  static async getPersonnel(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId).query(`
      SELECT c.id collaboratorId, c.employeeCode, c.documentNumber, c.firstName,
        c.lastName, c.photoPath, p.code positionCode, p.name positionName,
        currentAssignment.id assignmentId, currentAssignment.clientId,
        currentAssignment.siteId, currentAssignment.areaId, currentAssignment.shiftId, currentAssignment.startDate,
        COALESCE(client.tradeName, client.businessName) clientName,
        site.name siteName, area.name areaName, shift.name shiftName,
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
      OUTER APPLY (
        SELECT COUNT(*) assignmentCount,
          STRING_AGG(CONCAT(COALESCE(cl.tradeName, cl.businessName), N' / ', s.name, N' / ', COALESCE(ar.name, N'Sin área'), N' / ', sh.name), N' | ') assignmentSummary
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
          s.name siteName, ar.name areaName, sh.name shiftName, u.name assignedByName
        FROM dbo.CollaboratorAssignments a
        INNER JOIN dbo.Clients c ON c.id = a.clientId
        INNER JOIN dbo.Sites s ON s.id = a.siteId
        LEFT JOIN dbo.Areas ar ON ar.id = a.areaId
        INNER JOIN dbo.Shifts sh ON sh.id = a.shiftId
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
          .input('areaId', sql.Int, data.areaId)
          .input('shiftId', sql.Int, data.shiftId)
          .input('startDate', sql.Date, data.startDate)
          .input('replaceAll', sql.Bit, replaceAll)
          .query(`
            UPDATE dbo.CollaboratorAssignments
            SET endDate = @startDate, estado = 0
            WHERE collaboratorId = @collaboratorId AND companyId = @companyId
              AND endDate IS NULL AND estado = 1
              AND (@replaceAll = 1 OR (siteId = @siteId AND areaId = @areaId AND shiftId = @shiftId))
          `);
        const result = await new sql.Request(transaction)
          .input('companyId', sql.Int, companyId)
          .input('collaboratorId', sql.Int, collaboratorId)
          .input('clientId', sql.Int, data.clientId)
          .input('siteId', sql.Int, data.siteId)
          .input('areaId', sql.Int, data.areaId)
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
}

module.exports = AssignmentModel;
