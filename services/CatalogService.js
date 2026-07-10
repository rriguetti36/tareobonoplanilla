const CatalogModel = require('../models/CatalogModel');

const normalizeCode = (value) => value.trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');

class CatalogService {
  static getAll(catalog, companyId, includeInactive = false) {
    return CatalogModel.getAll(catalog, companyId, includeInactive);
  }

  static async create(catalog, companyId, data) {
    if (!data.name?.trim()) {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    const code = normalizeCode(data.code || data.name);
    if (!code || code.length > 30) {
      const error = new Error('El codigo no es valido');
      error.status = 400;
      throw error;
    }
    if (await CatalogModel.getByCode(catalog, companyId, code)) {
      const error = new Error('Ya existe un registro con ese codigo');
      error.status = 409;
      throw error;
    }
    return CatalogModel.create(catalog, companyId, { ...data, code, name: data.name.trim() });
  }

  static async update(catalog, companyId, code, data) {
    const existing = await CatalogModel.getByCode(catalog, companyId, code);
    if (!existing) {
      const error = new Error('Registro no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.name?.trim()) {
      const error = new Error('El nombre es obligatorio');
      error.status = 400;
      throw error;
    }
    return CatalogModel.update(catalog, companyId, code, {
      name: data.name.trim(),
      description: data.description,
      estado: data.estado ?? existing.estado,
    });
  }
}

module.exports = CatalogService;
