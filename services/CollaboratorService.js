const CollaboratorModel = require('../models/CollaboratorModel');
const CatalogModel = require('../models/CatalogModel');
const UserModel = require('../models/UserModel');
const fs = require('fs');
const path = require('path');

const firstInitial = (value) => String(value || '').trim().normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').charAt(0).toUpperCase();

const buildEmployeeCode = (data) => {
  const documentNumber = String(data.documentNumber || '').trim().replace(/\s+/g, '').toUpperCase();
  return `${firstInitial(data.firstName)}${firstInitial(data.lastName)}${documentNumber}`;
};

class CollaboratorService {
  static getAll(companyId) { return CollaboratorModel.getAll(companyId); }

  static async getById(id, companyId) {
    const item = await CollaboratorModel.getById(id, companyId);
    if (!item) { const error = new Error('Colaborador no encontrado'); error.status = 404; throw error; }
    return item;
  }

  static async validate(data, companyId) {
    const required = {
      documentNumber: 'Número de documento', firstName: 'Nombres', lastName: 'Apellidos',
      positionId: 'Cargo', employmentTypeId: 'Tipo de vínculo',
    };
    const missing = Object.entries(required)
      .filter(([field]) => data[field] === null || data[field] === undefined || String(data[field]).trim() === '' || Number(data[field]) === 0)
      .map(([, label]) => label);
    if (missing.length) {
      const error = new Error(`Completa los campos obligatorios: ${missing.join(', ')}`); error.status = 400; throw error;
    }
    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      const error = new Error('La fecha de fin no puede ser anterior al ingreso'); error.status = 400; throw error;
    }
    const [position, employmentType, user] = await Promise.all([
      CatalogModel.getById('positions', companyId, Number(data.positionId)),
      CatalogModel.getById('employmentTypes', companyId, Number(data.employmentTypeId)),
      data.userId ? UserModel.getById(Number(data.userId), companyId) : null,
    ]);
    if (!position?.estado || !employmentType?.estado || (data.userId && !user)) {
      const error = new Error('Cargo, tipo de vinculo o usuario no pertenece a la empresa'); error.status = 400; throw error;
    }
  }

  static async create(data, companyId) {
    const normalized = {
      ...data, employeeCode: buildEmployeeCode(data), documentType: data.documentType || 'DNI',
      startDate: null, endDate: null, laborStatus: 'pending_hire', estado: 0,
    };
    await this.validate(normalized, companyId);
    return CollaboratorModel.create(companyId, normalized);
  }

  static async update(id, data, companyId) {
    const existing = await this.getById(id, companyId);
    const normalized = {
      ...data, employeeCode: buildEmployeeCode(data), documentType: data.documentType || 'DNI',
      startDate: existing.startDate, endDate: existing.endDate,
      laborStatus: existing.laborStatus, estado: existing.estado,
    };
    await this.validate(normalized, companyId);
    return CollaboratorModel.update(id, companyId, normalized);
  }

  static async updatePhoto(id, companyId, uploadedFile) {
    if (!uploadedFile) {
      const error = new Error('Selecciona una foto'); error.status = 400; throw error;
    }
    const existing = await this.getById(id, companyId);
    const relativePath = path.relative(process.cwd(), uploadedFile.path).replace(/\\/g, '/');
    const updated = await CollaboratorModel.updatePhoto(id, companyId, relativePath);
    if (existing.photoPath) {
      const previous = path.resolve(process.cwd(), existing.photoPath);
      const uploadsRoot = path.resolve(process.cwd(), 'uploads');
      if (previous.startsWith(`${uploadsRoot}${path.sep}`)) fs.promises.unlink(previous).catch(() => {});
    }
    return updated;
  }

  static async getPhoto(id, companyId) {
    const collaborator = await this.getById(id, companyId);
    if (!collaborator.photoPath) {
      const error = new Error('El colaborador no tiene foto'); error.status = 404; throw error;
    }
    const absolutePath = path.resolve(process.cwd(), collaborator.photoPath);
    const uploadsRoot = path.resolve(process.cwd(), 'uploads');
    if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`) || !fs.existsSync(absolutePath)) {
      const error = new Error('Foto no encontrada'); error.status = 404; throw error;
    }
    return absolutePath;
  }
}

module.exports = CollaboratorService;
