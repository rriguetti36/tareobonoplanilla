const CatalogService = require('../services/CatalogService');

const handlers = (catalog) => ({
  getAll: async (req, res, next) => {
    try {
      res.json(await CatalogService.getAll(catalog, req.user.companyId, req.query.includeInactive === 'true'));
    } catch (error) { next(error); }
  },
  create: async (req, res, next) => {
    try {
      res.status(201).json(await CatalogService.create(catalog, req.user.companyId, req.body));
    } catch (error) { next(error); }
  },
  update: async (req, res, next) => {
    try {
      res.json(await CatalogService.update(catalog, req.user.companyId, req.params.code, req.body));
    } catch (error) { next(error); }
  },
});

module.exports = {
  positions: handlers('positions'),
  employmentTypes: handlers('employmentTypes'),
  areas: handlers('areas'),
  attendanceStatuses: handlers('attendanceStatuses'),
  incidentTypes: handlers('incidentTypes'),
};
