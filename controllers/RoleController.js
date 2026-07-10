const RoleService = require('../services/RoleService');

class RoleController {
  static async getRoles(req, res, next) {
    try {
      res.json(await RoleService.getRoles(
        req.user.companyId,
        req.query.includeInactive === 'true',
      ));
    } catch (error) {
      next(error);
    }
  }

  static async createRole(req, res, next) {
    try {
      res.status(201).json(await RoleService.createRole(req.user.companyId, req.body));
    } catch (error) {
      next(error);
    }
  }

  static async updateRole(req, res, next) {
    try {
      res.json(await RoleService.updateRole(req.user.companyId, req.params.code, req.body));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = RoleController;
