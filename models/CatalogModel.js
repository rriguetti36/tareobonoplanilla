const { poolPromise, sql } = require('../config/db');

const TABLES = {
  positions: 'dbo.Positions',
  employmentTypes: 'dbo.EmploymentTypes',
  areas: 'dbo.Areas',
  attendanceStatuses: 'dbo.AttendanceStatuses',
  incidentTypes: 'dbo.IncidentTypes',
};

const getTable = (catalog) => {
  const table = TABLES[catalog];
  if (!table) throw new Error('Catalogo no soportado');
  return table;
};

class CatalogModel {
  static async getAll(catalog, companyId, includeInactive = false) {
    const table = getTable(catalog);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('includeInactive', sql.Bit, includeInactive)
      .query(`
        SELECT id, code, name, description, isSystem, estado, createdAt, updatedAt
        FROM ${table}
        WHERE companyId = @companyId AND (@includeInactive = 1 OR estado = 1)
        ORDER BY name
      `);
    return result.recordset;
  }

  static async getByCode(catalog, companyId, code) {
    const table = getTable(catalog);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(30), code)
      .query(`
        SELECT id, code, name, description, isSystem, estado
        FROM ${table}
        WHERE companyId = @companyId AND code = @code
      `);
    return result.recordset[0];
  }

  static async getById(catalog, companyId, id) {
    const table = getTable(catalog);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('id', sql.Int, id)
      .query(`SELECT id, code, name, estado FROM ${table} WHERE companyId = @companyId AND id = @id`);
    return result.recordset[0];
  }

  static async create(catalog, companyId, item) {
    const table = getTable(catalog);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(30), item.code)
      .input('name', sql.NVarChar(100), item.name)
      .input('description', sql.NVarChar(250), item.description || null)
      .query(`
        INSERT INTO ${table} (companyId, code, name, description)
        OUTPUT INSERTED.id, INSERTED.code, INSERTED.name,
               INSERTED.description, INSERTED.isSystem, INSERTED.estado
        VALUES (@companyId, @code, @name, @description)
      `);
    return result.recordset[0];
  }

  static async update(catalog, companyId, code, item) {
    const table = getTable(catalog);
    const pool = await poolPromise;
    const result = await pool.request()
      .input('companyId', sql.Int, companyId)
      .input('code', sql.NVarChar(30), code)
      .input('name', sql.NVarChar(100), item.name)
      .input('description', sql.NVarChar(250), item.description || null)
      .input('estado', sql.Bit, item.estado)
      .query(`
        UPDATE ${table}
        SET name = @name, description = @description, estado = @estado,
            updatedAt = SYSUTCDATETIME()
        WHERE companyId = @companyId AND code = @code;

        SELECT id, code, name, description, isSystem, estado
        FROM ${table}
        WHERE companyId = @companyId AND code = @code;
      `);
    return result.recordset[0];
  }
}

module.exports = CatalogModel;
