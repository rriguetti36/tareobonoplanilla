const RoleModel = require('../models/RoleModel');

const normalizeCode = (value) => value.trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

class RoleService {
  static getRoles(companyId, includeInactive = false) {
    return RoleModel.getAll(companyId, includeInactive);
  }

  static async requireActiveRole(companyId, code) {
    const role = await RoleModel.getByCode(companyId, code);
    if (!role || !role.estado) {
      const error = new Error('El rol seleccionado no existe o esta inactivo');
      error.status = 400;
      throw error;
    }
    return role;
  }

  static async createRole(companyId, data) {
    if (!data.name?.trim()) {
      const error = new Error('El nombre del rol es obligatorio');
      error.status = 400;
      throw error;
    }
    const code = normalizeCode(data.code || data.name);
    if (!code || code.length > 20) {
      const error = new Error('El codigo del rol no es valido');
      error.status = 400;
      throw error;
    }
    if (await RoleModel.getByCode(companyId, code)) {
      const error = new Error('Ya existe un rol con ese codigo');
      error.status = 409;
      throw error;
    }
    return RoleModel.create(companyId, { ...data, code, name: data.name.trim() });
  }

  static async updateRole(companyId, code, data) {
    const existing = await RoleModel.getByCode(companyId, code);
    if (!existing) {
      const error = new Error('Rol no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.name?.trim()) {
      const error = new Error('El nombre del rol es obligatorio');
      error.status = 400;
      throw error;
    }
    return RoleModel.update(companyId, code, {
      name: data.name.trim(),
      description: data.description,
      estado: data.estado ?? existing.estado,
    });
  }
}

module.exports = RoleService;
