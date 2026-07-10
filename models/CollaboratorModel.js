const { poolPromise, sql } = require('../config/db');

const selectFields = `
  c.id, c.companyId, c.userId, c.employeeCode, c.documentType, c.documentNumber,
  c.firstName, c.lastName, c.email, c.phone, c.photoPath, c.positionId, c.employmentTypeId,
  a.clientId, a.siteId, a.shiftId,
  c.startDate, c.endDate, c.baseSalary, c.laborStatus, c.estado, c.createdAt, c.updatedAt,
  p.name AS positionName, p.code AS positionCode, et.name AS employmentTypeName, u.username,
  COALESCE(cl.tradeName, cl.businessName) AS clientName, s.name AS siteName, sh.name AS shiftName,
  CONVERT(BIT,CASE WHEN EXISTS(SELECT 1 FROM dbo.PersonnelProcesses hp WHERE hp.companyId=c.companyId AND hp.collaboratorId=c.id AND hp.processType=N'hire' AND hp.status=N'approved') THEN 1 ELSE 0 END) AS hasApprovedHire
`;

class CollaboratorModel {
  static async getAll(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId).query(`
      SELECT ${selectFields}
      FROM dbo.Collaborators c
      INNER JOIN dbo.Positions p ON p.id = c.positionId
      INNER JOIN dbo.EmploymentTypes et ON et.id = c.employmentTypeId
      LEFT JOIN dbo.Users u ON u.id = c.userId
      OUTER APPLY (SELECT TOP 1 x.* FROM dbo.CollaboratorAssignments x WHERE x.collaboratorId=c.id AND x.endDate IS NULL AND x.estado=1) a
      LEFT JOIN dbo.Clients cl ON cl.id = a.clientId
      LEFT JOIN dbo.Sites s ON s.id = a.siteId
      LEFT JOIN dbo.Shifts sh ON sh.id = a.shiftId
      WHERE c.companyId = @companyId
      ORDER BY c.lastName, c.firstName
    `);
    return result.recordset;
  }

  static async getById(id, companyId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('id', sql.Int, id).input('companyId', sql.Int, companyId).query(`
        SELECT ${selectFields}
        FROM dbo.Collaborators c
        INNER JOIN dbo.Positions p ON p.id = c.positionId
        INNER JOIN dbo.EmploymentTypes et ON et.id = c.employmentTypeId
        LEFT JOIN dbo.Users u ON u.id = c.userId
        OUTER APPLY (SELECT TOP 1 x.* FROM dbo.CollaboratorAssignments x WHERE x.collaboratorId=c.id AND x.endDate IS NULL AND x.estado=1) a
        LEFT JOIN dbo.Clients cl ON cl.id = a.clientId
        LEFT JOIN dbo.Sites s ON s.id = a.siteId
        LEFT JOIN dbo.Shifts sh ON sh.id = a.shiftId
        WHERE c.id = @id AND c.companyId = @companyId
      `);
    return result.recordset[0];
  }

  static requestData(request, data) {
    return request
      .input('userId', sql.Int, data.userId || null)
      .input('employeeCode', sql.NVarChar(30), data.employeeCode)
      .input('documentType', sql.NVarChar(10), data.documentType)
      .input('documentNumber', sql.NVarChar(20), data.documentNumber)
      .input('firstName', sql.NVarChar(100), data.firstName)
      .input('lastName', sql.NVarChar(100), data.lastName)
      .input('email', sql.NVarChar(150), data.email || null)
      .input('phone', sql.NVarChar(30), data.phone || null)
      .input('positionId', sql.Int, data.positionId)
      .input('employmentTypeId', sql.Int, data.employmentTypeId)
      .input('clientId', sql.Int, data.clientId || null)
      .input('siteId', sql.Int, data.siteId || null)
      .input('startDate', sql.Date, data.startDate || null)
      .input('endDate', sql.Date, data.endDate || null)
      .input('baseSalary',sql.Decimal(12,2),data.baseSalary===''||data.baseSalary==null?null:Number(data.baseSalary))
      .input('laborStatus', sql.NVarChar(20), data.laborStatus || (Number(data.estado) ? 'active' : 'terminated'))
      .input('estado', sql.Bit, data.estado ?? 1);
  }

  static async create(companyId, data) {
    const pool = await poolPromise;
    const request = this.requestData(pool.request().input('companyId', sql.Int, companyId), data);
    const result = await request.query(`
      INSERT INTO dbo.Collaborators (
        companyId, userId, employeeCode, documentType, documentNumber, firstName,
        lastName, email, phone, positionId, employmentTypeId, clientId, siteId, startDate, endDate, baseSalary, laborStatus, estado
      ) OUTPUT INSERTED.id
      VALUES (
        @companyId, @userId, @employeeCode, @documentType, @documentNumber, @firstName,
        @lastName, @email, @phone, @positionId, @employmentTypeId, @clientId, @siteId, @startDate, @endDate, @baseSalary, @laborStatus, @estado
      )
    `);
    const id = result.recordset[0].id;
    if (data.userId) {
      await pool.request().input('userId', sql.Int, data.userId).input('companyId', sql.Int, companyId)
        .query('UPDATE dbo.Users SET estado=0 WHERE id=@userId AND companyId=@companyId');
    }
    return this.getById(id, companyId);
  }

  static async update(id, companyId, data) {
    const pool = await poolPromise;
    const request = this.requestData(
      pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId), data,
    );
    await request.query(`
      UPDATE dbo.Collaborators SET
        userId=@userId, employeeCode=@employeeCode, documentType=@documentType,
        documentNumber=@documentNumber, firstName=@firstName, lastName=@lastName,
        email=@email, phone=@phone, positionId=@positionId,
        employmentTypeId=@employmentTypeId, clientId=@clientId, siteId=@siteId, startDate=@startDate, endDate=@endDate,baseSalary=@baseSalary,
        laborStatus=@laborStatus, estado=@estado, updatedAt=SYSUTCDATETIME()
      WHERE id=@id AND companyId=@companyId
    `);
    return this.getById(id, companyId);
  }

  static async updatePhoto(id, companyId, photoPath) {
    const pool = await poolPromise;
    await pool.request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .input('photoPath', sql.NVarChar(500), photoPath)
      .query(`
        UPDATE dbo.Collaborators
        SET photoPath = @photoPath, updatedAt = SYSUTCDATETIME()
        WHERE id = @id AND companyId = @companyId
      `);
    return this.getById(id, companyId);
  }
}

module.exports = CollaboratorModel;
