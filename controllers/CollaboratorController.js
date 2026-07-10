const CollaboratorService = require('../services/CollaboratorService');

class CollaboratorController {
  static async getAll(req, res, next) { try { res.json(await CollaboratorService.getAll(req.user.companyId)); } catch (e) { next(e); } }
  static async getById(req, res, next) { try { res.json(await CollaboratorService.getById(Number(req.params.id), req.user.companyId)); } catch (e) { next(e); } }
  static async create(req, res, next) { try { res.status(201).json(await CollaboratorService.create(req.body, req.user.companyId)); } catch (e) { next(e); } }
  static async update(req, res, next) { try { res.json(await CollaboratorService.update(Number(req.params.id), req.body, req.user.companyId)); } catch (e) { next(e); } }
  static async updatePhoto(req, res, next) {
    try {
      res.json(await CollaboratorService.updatePhoto(Number(req.params.id), req.user.companyId, req.file));
    } catch (e) {
      if (req.file?.path) require('fs').promises.unlink(req.file.path).catch(() => {});
      next(e);
    }
  }
  static async getPhoto(req, res, next) { try { res.sendFile(await CollaboratorService.getPhoto(Number(req.params.id), req.user.companyId)); } catch (e) { next(e); } }
}

module.exports = CollaboratorController;
