const { poolPromise, sql } = require('../config/db');

class ClientModel {
  static async getAll(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId).query(`
      SELECT id,documentType,documentNumber,businessName,tradeName,contactName,contactEmail,contactPhone,estado,createdAt,updatedAt
      FROM dbo.Clients WHERE companyId=@companyId ORDER BY businessName`);
    return result.recordset;
  }
  static async getById(id, companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId).query(`
      SELECT id,documentType,documentNumber,businessName,tradeName,contactName,contactEmail,contactPhone,estado
      FROM dbo.Clients WHERE id=@id AND companyId=@companyId`);
    return result.recordset[0];
  }
  static bind(request, data) {
    return request.input('documentType', sql.NVarChar(10), data.documentType || 'RUC')
      .input('documentNumber', sql.NVarChar(20), data.documentNumber).input('businessName', sql.NVarChar(200), data.businessName)
      .input('tradeName', sql.NVarChar(150), data.tradeName || null).input('contactName', sql.NVarChar(150), data.contactName || null)
      .input('contactEmail', sql.NVarChar(150), data.contactEmail || null).input('contactPhone', sql.NVarChar(30), data.contactPhone || null)
      .input('estado', sql.Bit, data.estado ?? 1);
  }
  static async create(companyId, data) {
    const pool = await poolPromise;
    const request = this.bind(pool.request().input('companyId', sql.Int, companyId), data);
    const result = await request.query(`INSERT INTO dbo.Clients (companyId,documentType,documentNumber,businessName,tradeName,contactName,contactEmail,contactPhone,estado)
      OUTPUT INSERTED.id VALUES (@companyId,@documentType,@documentNumber,@businessName,@tradeName,@contactName,@contactEmail,@contactPhone,@estado)`);
    return this.getById(result.recordset[0].id, companyId);
  }
  static async update(id, companyId, data) {
    const pool = await poolPromise;
    const request = this.bind(pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId), data);
    await request.query(`UPDATE dbo.Clients SET documentType=@documentType,documentNumber=@documentNumber,businessName=@businessName,
      tradeName=@tradeName,contactName=@contactName,contactEmail=@contactEmail,contactPhone=@contactPhone,estado=@estado,
      updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId`);
    return this.getById(id, companyId);
  }
}
module.exports = ClientModel;
