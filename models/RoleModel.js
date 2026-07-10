const { poolPromise, sql } = require('../config/db');

class RoleModel {
  static async getAll(companyId, includeInactive = false) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('includeInactive', sql.Bit, includeInactive)
      .query(`
        SELECT id, code, name, description, isSystem, estado, createdAt, updatedAt
        FROM dbo.Roles
        WHERE companyId = @companyId AND (@includeInactive = 1 OR estado = 1)
        ORDER BY name
      `);
    return result.recordset;
  }

  static async getByCode(companyId, code) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(20), code)
      .query(`
        SELECT id, code, name, description, isSystem, estado
        FROM dbo.Roles
        WHERE companyId = @companyId AND code = @code
      `);
    return result.recordset[0];
  }

  static async create(companyId, role) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(20), role.code)
      .input('name', sql.NVarChar(80), role.name)
      .input('description', sql.NVarChar(250), role.description || null)
      .query(`
        INSERT INTO dbo.Roles (companyId, code, name, description)
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.name,
               INSERTED.description, INSERTED.isSystem, INSERTED.estado
        VALUES (@companyId, @code, @name, @description)
      `);
    return result.recordset[0];
  }

  static async update(companyId, code, role) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(20), code)
      .input('name', sql.NVarChar(80), role.name)
      .input('description', sql.NVarChar(250), role.description || null)
      .input('estado', sql.Bit, role.estado)
      .query(`
        UPDATE dbo.Roles
        SET name = @name, description = @description, estado = @estado,
            updatedAt = SYSUTCDATETIME()
        WHERE companyId = @companyId AND code = @code;

        SELECT id, code, name, description, isSystem, estado
        FROM dbo.Roles
        WHERE companyId = @companyId AND code = @code;
      `);
    return result.recordset[0];
  }
}

module.exports = RoleModel;
