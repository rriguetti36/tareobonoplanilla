const { poolPromise, sql } = require('../config/db');

const publicUserFields = `
  id, companyId, name, username, email, estado, role, createdAt, updatedAt
`;

class UserModel {
  static async getAll(companyId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('companyId', sql.Int, companyId)
      .query(`SELECT ${publicUserFields} FROM dbo.Users WHERE companyId = @companyId`);
    return result.recordset;
  }

  static async getById(id, companyId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .query(`
        SELECT ${publicUserFields}
        FROM dbo.Users
        WHERE id = @id AND companyId = @companyId
      `);
    return result.recordset[0];
  }

  static async getByCredential(credential) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('credential', sql.NVarChar(150), credential)
      .query(`
        SELECT
          u.id, u.companyId, u.name, u.username, u.email, u.password,
          u.estado, u.role,
          c.code AS companyCode,
          c.businessName AS companyBusinessName,
          c.tradeName AS companyTradeName,
          c.estado AS companyEstado
        FROM dbo.Users u
        INNER JOIN dbo.Companies c ON c.id = u.companyId
        WHERE UPPER(u.username) = UPPER(@credential)
           OR UPPER(u.email) = UPPER(@credential)
      `);
    return result.recordset[0];
  }

  static async create(user) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('companyId', sql.Int, user.companyId)
      .input('name', sql.NVarChar(100), user.name)
      .input('email', sql.NVarChar(150), user.email)
      .input('password', sql.NVarChar(255), user.password)
      .input('estado', sql.Bit, user.estado ?? 1)
      .input('role', sql.NVarChar(20), user.role ?? 'colaborador')
      .query(`
        INSERT INTO dbo.Users (companyId, name, email, password, estado, role)
        OUTPUT INSERTED.id, INSERTED.companyId, INSERTED.name,
               INSERTED.email, INSERTED.estado, INSERTED.role
        VALUES (@companyId, @name, @email, @password, @estado, @role)
      `);
    return result.recordset[0];
  }

  static async update(id, companyId, user) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .input('name', sql.NVarChar(100), user.name)
      .input('email', sql.NVarChar(150), user.email)
      .input('estado', sql.Bit, user.estado ?? 1)
      .input('role', sql.NVarChar(20), user.role ?? 'colaborador')
      .query(`
        UPDATE dbo.Users
        SET name = @name,
            email = @email,
            estado = @estado,
            role = @role,
            updatedAt = SYSUTCDATETIME()
        WHERE id = @id AND companyId = @companyId;

        SELECT ${publicUserFields}
        FROM dbo.Users
        WHERE id = @id AND companyId = @companyId;
      `);
    return result.recordset[0];
  }

  static async updatePassword(id, companyId, password) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .input('password', sql.NVarChar(255), password)
      .query(`
        UPDATE dbo.Users
        SET password = @password, updatedAt = SYSUTCDATETIME()
        WHERE id = @id AND companyId = @companyId;

        SELECT ${publicUserFields}
        FROM dbo.Users
        WHERE id = @id AND companyId = @companyId;
      `);
    return result.recordset[0];
  }

  static async delete(id, companyId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('companyId', sql.Int, companyId)
      .query(`
        DELETE FROM dbo.Users
        OUTPUT DELETED.id
        WHERE id = @id AND companyId = @companyId
      `);
    return { deleted: result.recordset.length > 0 };
  }
}

module.exports = UserModel;
