const { poolPromise, sql } = require('../config/db')

class AttendanceModel {
  static async list(companyId, user = null) {
    const pool = await poolPromise
    const request = pool.request().input('companyId', sql.Int, companyId)
    const supervisorFilter = user?.role === 'supervisor'
      ? `AND EXISTS (
          SELECT 1
          FROM dbo.CollaboratorAssignments sup
          INNER JOIN dbo.Collaborators sc ON sc.id = sup.collaboratorId
          WHERE sc.userId = @userId
            AND sup.companyId = @companyId
            AND sup.estado = 1
            AND sup.endDate IS NULL
            AND sup.siteId = s.siteId
            AND sup.shiftId = s.shiftId
            AND sup.startDate <= s.attendanceDate
        )`
      : ''
    if (user?.role === 'supervisor') request.input('userId', sql.Int, user.id)
    const r = await request.query(`
      SELECT s.*,COALESCE(c.tradeName,c.businessName) clientName,st.name siteName,a.name areaName,sh.name shiftName,u.name supervisorName,
        (SELECT COUNT(*) FROM dbo.AttendanceExpected e WHERE e.sheetId=s.id) expectedCount,
        (SELECT COUNT(DISTINCT m.collaboratorId) FROM dbo.AttendanceMarks m WHERE m.sheetId=s.id AND m.estado=1) markedCount
      FROM dbo.AttendanceSheets s
      JOIN dbo.Clients c ON c.id=s.clientId
      JOIN dbo.Sites st ON st.id=s.siteId
      JOIN dbo.Areas a ON a.id=s.areaId
      JOIN dbo.Shifts sh ON sh.id=s.shiftId
      JOIN dbo.Users u ON u.id=s.supervisorId
      WHERE s.companyId=@companyId
        ${supervisorFilter}
      ORDER BY s.attendanceDate DESC,s.id DESC
    `)
    return r.recordset
  }

  static async generalReport(companyId, filters = {}) {
    const pool = await poolPromise
    const request = pool.request()
      .input('companyId', sql.Int, companyId)
      .input('from', sql.Date, filters.from || null)
      .input('to', sql.Date, filters.to || null)
      .input('clientId', sql.Int, filters.clientId ? Number(filters.clientId) : null)
      .input('siteId', sql.Int, filters.siteId ? Number(filters.siteId) : null)
      .input('areaId', sql.Int, filters.areaId ? Number(filters.areaId) : null)
      .input('shiftId', sql.Int, filters.shiftId ? Number(filters.shiftId) : null)
      .input('status', sql.NVarChar(30), filters.status || null)
      .input('q', sql.NVarChar(120), filters.q ? `%${String(filters.q).trim()}%` : null)

    const r = await request.query(`
      SELECT
        s.id sheetId,
        s.attendanceDate,
        s.status sheetStatus,
        COALESCE(cl.tradeName,cl.businessName) clientName,
        st.name siteName,
        ar.name areaName,
        sh.name shiftName,
        sh.startTime,
        sh.endTime,
        u.name supervisorName,
        e.collaboratorId,
        c.employeeCode,
        c.documentNumber,
        c.firstName,
        c.lastName,
        p.name positionName,
        wt.name workTableName,
        ast.code statusCode,
        ast.name statusName,
        e.supervisorValidation,
        e.observation,
        entry.markedAt entryAt,
        entry.source entrySource,
        entry.minutesLate,
        exitMark.markedAt exitAt,
        exitMark.source exitSource,
        CASE
          WHEN entry.markedAt IS NOT NULL AND exitMark.markedAt IS NOT NULL
          THEN DATEDIFF(MINUTE, entry.markedAt, exitMark.markedAt)
          ELSE NULL
        END workedMinutes,
        CASE
          WHEN entry.markedAt IS NOT NULL AND exitMark.markedAt IS NOT NULL AND DATEDIFF(MINUTE, entry.markedAt, exitMark.markedAt) > 540
          THEN DATEDIFF(MINUTE, entry.markedAt, exitMark.markedAt) - 540
          ELSE 0
        END extraMinutes
      FROM dbo.AttendanceSheets s
      JOIN dbo.Clients cl ON cl.id=s.clientId
      JOIN dbo.Sites st ON st.id=s.siteId
      JOIN dbo.Areas ar ON ar.id=s.areaId
      JOIN dbo.Shifts sh ON sh.id=s.shiftId
      JOIN dbo.Users u ON u.id=s.supervisorId
      JOIN dbo.AttendanceExpected e ON e.sheetId=s.id
      JOIN dbo.Collaborators c ON c.id=e.collaboratorId
      JOIN dbo.Positions p ON p.id=c.positionId
      LEFT JOIN dbo.WorkTables wt ON wt.id=e.workTableId
      LEFT JOIN dbo.AttendanceStatuses ast ON ast.id=e.attendanceStatusId
      OUTER APPLY (
        SELECT TOP 1 m.markedAt,m.source,m.minutesLate
        FROM dbo.AttendanceMarks m
        WHERE m.sheetId=e.sheetId AND m.collaboratorId=e.collaboratorId AND m.markingType=N'entry' AND m.estado=1
        ORDER BY m.markedAt ASC
      ) entry
      OUTER APPLY (
        SELECT TOP 1 m.markedAt,m.source
        FROM dbo.AttendanceMarks m
        WHERE m.sheetId=e.sheetId AND m.collaboratorId=e.collaboratorId AND m.markingType=N'exit' AND m.estado=1
        ORDER BY m.markedAt DESC
      ) exitMark
      WHERE s.companyId=@companyId
        AND (@from IS NULL OR s.attendanceDate >= @from)
        AND (@to IS NULL OR s.attendanceDate <= @to)
        AND (@clientId IS NULL OR s.clientId = @clientId)
        AND (@siteId IS NULL OR s.siteId = @siteId)
        AND (@areaId IS NULL OR s.areaId = @areaId)
        AND (@shiftId IS NULL OR s.shiftId = @shiftId)
        AND (@status IS NULL OR s.status = @status)
        AND (
          @q IS NULL
          OR c.documentNumber LIKE @q
          OR c.employeeCode LIKE @q
          OR c.firstName LIKE @q
          OR c.lastName LIKE @q
          OR wt.name LIKE @q
        )
      ORDER BY s.attendanceDate DESC, st.name, ar.name, sh.name, c.lastName, c.firstName
    `)
    return r.recordset
  }

  static async supervisorCanAccessScope(companyId, userId, scope) {
    const pool = await poolPromise
    const r = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('userId', sql.Int, userId)
      .input('siteId', sql.Int, Number(scope.siteId))
      .input('shiftId', sql.Int, Number(scope.shiftId))
      .input('date', sql.Date, scope.attendanceDate)
      .query(`
        SELECT TOP 1 sup.id
        FROM dbo.CollaboratorAssignments sup
        INNER JOIN dbo.Collaborators sc ON sc.id = sup.collaboratorId
        WHERE sc.userId = @userId
          AND sup.companyId = @companyId
          AND sup.estado = 1
          AND sup.endDate IS NULL
          AND sup.siteId = @siteId
          AND sup.shiftId = @shiftId
          AND sup.startDate <= @date
      `)
    return Boolean(r.recordset[0])
  }

  static async getSheet(id, companyId) {
    const pool = await poolPromise
    const r = await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId).query(`
      SELECT s.*,sh.startTime,sh.endTime,COALESCE(c.tradeName,c.businessName) clientName,st.name siteName,a.name areaName,sh.name shiftName,u.name supervisorName
      FROM dbo.AttendanceSheets s
      JOIN dbo.Clients c ON c.id=s.clientId
      JOIN dbo.Sites st ON st.id=s.siteId
      JOIN dbo.Areas a ON a.id=s.areaId
      JOIN dbo.Shifts sh ON sh.id=s.shiftId
      JOIN dbo.Users u ON u.id=s.supervisorId
      WHERE s.id=@id AND s.companyId=@companyId
    `)
    return r.recordset[0]
  }

  static async createSheet(data, companyId, userId) {
    const pool = await poolPromise
    const tx = new sql.Transaction(pool)
    await tx.begin()
    try {
      const r = await new sql.Request(tx)
        .input('companyId', sql.Int, companyId)
        .input('clientId', sql.Int, data.clientId)
        .input('siteId', sql.Int, data.siteId)
        .input('areaId', sql.Int, data.areaId)
        .input('shiftId', sql.Int, data.shiftId)
        .input('date', sql.Date, data.attendanceDate)
        .input('userId', sql.Int, userId)
        .query(`INSERT dbo.AttendanceSheets(companyId,clientId,siteId,areaId,shiftId,attendanceDate,supervisorId,status) OUTPUT INSERTED.id VALUES(@companyId,@clientId,@siteId,@areaId,@shiftId,@date,@userId,N'in_progress')`)
      const id = r.recordset[0].id
      await new sql.Request(tx)
        .input('sheetId', sql.Int, id)
        .input('companyId', sql.Int, companyId)
        .input('siteId', sql.Int, data.siteId)
        .input('areaId', sql.Int, data.areaId)
        .input('shiftId', sql.Int, data.shiftId)
        .input('date', sql.Date, data.attendanceDate)
        .query(`
          INSERT dbo.AttendanceExpected(sheetId,collaboratorId,workTableId)
          SELECT DISTINCT @sheetId,x.collaboratorId,x.workTableId
          FROM dbo.CollaboratorAssignments x
          JOIN dbo.Collaborators c ON c.id=x.collaboratorId
          WHERE x.companyId=@companyId AND x.siteId=@siteId AND x.areaId=@areaId AND x.shiftId=@shiftId
            AND x.estado=1 AND c.estado=1 AND x.startDate<=@date AND (x.endDate IS NULL OR x.endDate>=@date)
        `)
      await tx.commit()
      return this.getSheet(id, companyId)
    } catch (e) {
      await tx.rollback()
      throw e
    }
  }

  static async expected(sheetId, companyId) {
    const pool = await poolPromise
    const r = await pool.request().input('sheetId', sql.Int, sheetId).input('companyId', sql.Int, companyId).query(`
      SELECT e.id,e.collaboratorId,e.workTableId,wt.name workTableName,e.supervisorValidation,e.observation,
        c.employeeCode,c.documentNumber,c.firstName,c.lastName,p.name positionName,ast.code statusCode,ast.name statusName,
        (SELECT MIN(markedAt) FROM dbo.AttendanceMarks m WHERE m.sheetId=e.sheetId AND m.collaboratorId=e.collaboratorId AND m.markingType=N'entry' AND m.estado=1) entryAt,
        (SELECT MAX(markedAt) FROM dbo.AttendanceMarks m WHERE m.sheetId=e.sheetId AND m.collaboratorId=e.collaboratorId AND m.markingType=N'exit' AND m.estado=1) exitAt
      FROM dbo.AttendanceExpected e
      JOIN dbo.AttendanceSheets s ON s.id=e.sheetId
      JOIN dbo.Collaborators c ON c.id=e.collaboratorId
      JOIN dbo.Positions p ON p.id=c.positionId
      LEFT JOIN dbo.WorkTables wt ON wt.id=e.workTableId
      LEFT JOIN dbo.AttendanceStatuses ast ON ast.id=e.attendanceStatusId
      WHERE e.sheetId=@sheetId AND s.companyId=@companyId
      ORDER BY wt.name,c.lastName,c.firstName
    `)
    return r.recordset
  }

  static async expectedRecord(sheetId, collaboratorId) {
    const pool = await poolPromise
    const r = await pool.request().input('sheetId', sql.Int, sheetId).input('collaboratorId', sql.Int, collaboratorId).query(`SELECT * FROM dbo.AttendanceExpected WHERE sheetId=@sheetId AND collaboratorId=@collaboratorId`)
    return r.recordset[0]
  }

  static async settings(companyId) {
    const pool = await poolPromise
    const r = await pool.request().input('companyId', sql.Int, companyId).query(`SELECT s.*,(SELECT TOP 1 entryToleranceMinutes FROM dbo.ToleranceRules t WHERE t.companyId=@companyId AND t.estado=1 ORDER BY t.id) entryToleranceMinutes FROM dbo.AttendanceSettings s WHERE s.companyId=@companyId`)
    return r.recordset[0]
  }

  static async createQr(sheetId, type, hash, expiresAt, userId) {
    const pool = await poolPromise
    await pool.request().input('sheetId', sql.Int, sheetId).query(`UPDATE dbo.AttendanceQrEvents SET active=0,closedAt=SYSUTCDATETIME() WHERE sheetId=@sheetId AND active=1`)
    const r = await pool.request().input('sheetId', sql.Int, sheetId).input('type', sql.NVarChar(20), type).input('hash', sql.Char(64), hash).input('expires', sql.DateTime2, expiresAt).input('userId', sql.Int, userId).query(`INSERT dbo.AttendanceQrEvents(sheetId,markingType,tokenHash,expiresAt,createdBy) OUTPUT INSERTED.id VALUES(@sheetId,@type,@hash,@expires,@userId)`)
    return r.recordset[0]
  }

  static async qrByHash(hash) {
    const pool = await poolPromise
    const r = await pool.request().input('hash', sql.Char(64), hash).query(`SELECT q.*,s.companyId,s.status sheetStatus,s.attendanceDate,s.clientId,s.siteId,s.areaId,s.shiftId,sh.startTime,sh.endTime FROM dbo.AttendanceQrEvents q JOIN dbo.AttendanceSheets s ON s.id=q.sheetId JOIN dbo.Shifts sh ON sh.id=s.shiftId WHERE q.tokenHash=@hash`)
    return r.recordset[0]
  }

  static async collaboratorByUser(userId, companyId) {
    const pool = await poolPromise
    const r = await pool.request().input('userId', sql.Int, userId).input('companyId', sql.Int, companyId).query(`SELECT * FROM dbo.Collaborators WHERE userId=@userId AND companyId=@companyId`)
    return r.recordset[0]
  }

  static async collaboratorByCode(code, companyId) {
    const pool = await poolPromise
    const value = String(code || '').trim()
    const r = await pool.request().input('code', sql.NVarChar(60), value).input('companyId', sql.Int, companyId).query(`
      SELECT TOP 1 * FROM dbo.Collaborators
      WHERE companyId=@companyId AND estado=1 AND laborStatus=N'active'
        AND (documentNumber=@code OR employeeCode=@code)
      ORDER BY id
    `)
    return r.recordset[0]
  }

  static async isExpected(sheetId, collaboratorId) {
    return Boolean(await this.expectedRecord(sheetId, collaboratorId))
  }

  static async hasMark(sheetId, collaboratorId, markingType) {
    const pool = await poolPromise
    const r = await pool.request().input('sheetId', sql.Int, sheetId).input('collaboratorId', sql.Int, collaboratorId).input('type', sql.NVarChar(20), markingType).query(`SELECT TOP 1 id,markedAt FROM dbo.AttendanceMarks WHERE sheetId=@sheetId AND collaboratorId=@collaboratorId AND markingType=@type AND estado=1 ORDER BY markedAt`)
    return r.recordset[0]
  }

  static async statusId(companyId, code) {
    const pool = await poolPromise
    const r = await pool.request().input('companyId', sql.Int, companyId).input('code', sql.NVarChar(30), code).query(`SELECT id FROM dbo.AttendanceStatuses WHERE companyId=@companyId AND code=@code AND estado=1`)
    return r.recordset[0]?.id
  }

  static async createMark(data) {
    const pool = await poolPromise
    const r = await pool.request()
      .input('sheetId', sql.Int, data.sheetId)
      .input('eventId', sql.Int, data.qrEventId || null)
      .input('collaboratorId', sql.Int, data.collaboratorId)
      .input('workTableId', sql.Int, data.workTableId || null)
      .input('type', sql.NVarChar(20), data.markingType)
      .input('source', sql.NVarChar(20), data.source)
      .input('statusId', sql.Int, data.statusId || null)
      .input('minutesLate', sql.Int, data.minutesLate ?? null)
      .input('reason', sql.NVarChar(250), data.reason || null)
      .input('observation', sql.NVarChar(500), data.observation || null)
      .input('device', sql.NVarChar(250), data.deviceInfo || null)
      .input('lat', sql.Decimal(9, 6), data.latitude || null)
      .input('lng', sql.Decimal(9, 6), data.longitude || null)
      .input('userId', sql.Int, data.registeredBy)
      .query(`
        INSERT dbo.AttendanceMarks(sheetId,qrEventId,collaboratorId,workTableId,markingType,source,attendanceStatusId,minutesLate,reason,observation,deviceInfo,latitude,longitude,registeredBy)
        OUTPUT INSERTED.*
        VALUES(@sheetId,@eventId,@collaboratorId,@workTableId,@type,@source,@statusId,@minutesLate,@reason,@observation,@device,@lat,@lng,@userId);
        UPDATE dbo.AttendanceExpected SET attendanceStatusId=@statusId WHERE sheetId=@sheetId AND collaboratorId=@collaboratorId
      `)
    return r.recordset[0]
  }

  static async validateExpected(sheetId, collaboratorId, validation, observation) {
    const pool = await poolPromise
    await pool.request().input('sheetId', sql.Int, sheetId).input('collaboratorId', sql.Int, collaboratorId).input('validation', sql.NVarChar(20), validation).input('observation', sql.NVarChar(500), observation || null).query(`UPDATE dbo.AttendanceExpected SET supervisorValidation=@validation,observation=@observation WHERE sheetId=@sheetId AND collaboratorId=@collaboratorId`)
  }

  static async markAbsences(sheetId, statusId) {
    const pool = await poolPromise
    await pool.request().input('sheetId', sql.Int, sheetId).input('statusId', sql.Int, statusId).query(`UPDATE e SET attendanceStatusId=@statusId FROM dbo.AttendanceExpected e WHERE e.sheetId=@sheetId AND NOT EXISTS(SELECT 1 FROM dbo.AttendanceMarks m WHERE m.sheetId=e.sheetId AND m.collaboratorId=e.collaboratorId AND m.markingType=N'entry' AND m.estado=1)`)
  }

  static async setSheetStatus(id, companyId, status, userId, notes) {
    const pool = await poolPromise
    await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId).input('status', sql.NVarChar(30), status).input('userId', sql.Int, userId).input('notes', sql.NVarChar(500), notes || null).query(`UPDATE dbo.AttendanceSheets SET status=@status,notes=COALESCE(@notes,notes),closedAt=CASE WHEN @status=N'supervisor_closed' THEN SYSUTCDATETIME() ELSE closedAt END,reviewedBy=CASE WHEN @status IN(N'rrhh_observed',N'rrhh_approved',N'reopened',N'cancelled') THEN @userId ELSE reviewedBy END,reviewedAt=CASE WHEN @status IN(N'rrhh_observed',N'rrhh_approved',N'reopened',N'cancelled') THEN SYSUTCDATETIME() ELSE reviewedAt END,updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId`)
    return this.getSheet(id, companyId)
  }

  static async audit(companyId, sheetId, action, userId, collaboratorId, detail, device, ip) {
    const pool = await poolPromise
    await pool.request().input('companyId', sql.Int, companyId).input('sheetId', sql.Int, sheetId || null).input('action', sql.NVarChar(60), action).input('userId', sql.Int, userId).input('collaboratorId', sql.Int, collaboratorId || null).input('detail', sql.NVarChar(1000), detail || null).input('device', sql.NVarChar(250), device || null).input('ip', sql.NVarChar(64), ip || null).query(`INSERT dbo.AttendanceAudit(companyId,sheetId,action,userId,collaboratorId,detail,deviceInfo,ipAddress) VALUES(@companyId,@sheetId,@action,@userId,@collaboratorId,@detail,@device,@ip)`)
  }
}

module.exports = AttendanceModel
