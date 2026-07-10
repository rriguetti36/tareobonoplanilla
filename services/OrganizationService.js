const SiteModel = require('../models/SiteModel');
const ClientModel = require('../models/ClientModel');

const models = { sites: SiteModel, clients: ClientModel };
class OrganizationService {
  static getAll(type, companyId) { return models[type].getAll(companyId); }
  static async save(type, id, data, companyId) {
    if (type === 'sites' && (!data.code?.trim() || !data.name?.trim())) {
      const error = new Error('Codigo y nombre son obligatorios'); error.status = 400; throw error;
    }
    if (type === 'sites') {
      const client = await ClientModel.getById(Number(data.clientId), companyId);
      if (!client || !client.estado) {
        const error = new Error('Selecciona un cliente activo de la empresa'); error.status = 400; throw error;
      }
    }
    if (type === 'clients' && (!data.documentNumber?.trim() || !data.businessName?.trim())) {
      const error = new Error('Documento y razon social son obligatorios'); error.status = 400; throw error;
    }
    if (id) {
      const existing = await models[type].getById(id, companyId);
      if (!existing) { const error = new Error('Registro no encontrado'); error.status = 404; throw error; }
      return models[type].update(id, companyId, data);
    }
    return models[type].create(companyId, data);
  }
}
module.exports = OrganizationService;
