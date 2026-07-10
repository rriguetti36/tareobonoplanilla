const OrganizationService = require('../services/OrganizationService');
const handlers = (type) => ({
  getAll: async (req,res,next) => { try { res.json(await OrganizationService.getAll(type,req.user.companyId)); } catch(e) { next(e); } },
  create: async (req,res,next) => { try { res.status(201).json(await OrganizationService.save(type,null,req.body,req.user.companyId)); } catch(e) { next(e); } },
  update: async (req,res,next) => { try { res.json(await OrganizationService.save(type,Number(req.params.id),req.body,req.user.companyId)); } catch(e) { next(e); } },
});
module.exports = { sites: handlers('sites'), clients: handlers('clients') };
