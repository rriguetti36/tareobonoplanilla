const { poolPromise, sql } = require('../config/db');

class SiteModel {
  static async getAll(companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('companyId', sql.Int, companyId)
      .query(`SELECT s.id,s.clientId,s.code,s.name,s.address,s.department,s.province,s.district,s.estado,
        s.createdAt,s.updatedAt,COALESCE(c.tradeName,c.businessName) AS clientName
        FROM dbo.Sites s INNER JOIN dbo.Clients c ON c.id=s.clientId
        WHERE s.companyId=@companyId ORDER BY c.businessName,s.name`);
    return result.recordset;
  }
  static async getById(id, companyId) {
    const pool = await poolPromise;
    const result = await pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId)
      .query(`SELECT s.id,s.clientId,s.code,s.name,s.address,s.department,s.province,s.district,s.estado,
        COALESCE(c.tradeName,c.businessName) AS clientName FROM dbo.Sites s
        INNER JOIN dbo.Clients c ON c.id=s.clientId WHERE s.id=@id AND s.companyId=@companyId`);
    return result.recordset[0];
  }
  static bind(request, data) {
    return request.input('clientId', sql.Int, data.clientId).input('code', sql.NVarChar(30), data.code).input('name', sql.NVarChar(120), data.name)
      .input('address', sql.NVarChar(250), data.address || null).input('department', sql.NVarChar(100), data.department || null)
      .input('province', sql.NVarChar(100), data.province || null).input('district', sql.NVarChar(100), data.district || null)
      .input('estado', sql.Bit, data.estado ?? 1);
  }
  static async create(companyId, data) {
    const pool = await poolPromise;
    const request = this.bind(pool.request().input('companyId', sql.Int, companyId), data);
    const result = await request.query(`INSERT INTO dbo.Sites (companyId,clientId,code,name,address,department,province,district,estado)
      OUTPUT INSERTED.id VALUES (@companyId,@clientId,@code,@name,@address,@department,@province,@district,@estado)`);
    return this.getById(result.recordset[0].id, companyId);
  }
  static async update(id, companyId, data) {
    const pool = await poolPromise;
    const request = this.bind(pool.request().input('id', sql.Int, id).input('companyId', sql.Int, companyId), data);
    await request.query(`UPDATE dbo.Sites SET clientId=@clientId,code=@code,name=@name,address=@address,department=@department,
      province=@province,district=@district,estado=@estado,updatedAt=SYSUTCDATETIME() WHERE id=@id AND companyId=@companyId`);
    return this.getById(id, companyId);
  }
}
module.exports = SiteModel;
