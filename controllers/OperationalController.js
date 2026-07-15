const ShiftService = require('../services/ShiftService');
const AssignmentService = require('../services/AssignmentService');

module.exports = {
  getShifts: async (req, res, next) => {
    try { res.json(await ShiftService.getAll(req.user.companyId)); } catch (e) { next(e); }
  },
  createShift: async (req, res, next) => {
    try { res.status(201).json(await ShiftService.save(null, req.body, req.user.companyId)); } catch (e) { next(e); }
  },
  updateShift: async (req, res, next) => {
    try { res.json(await ShiftService.save(Number(req.params.id), req.body, req.user.companyId)); } catch (e) { next(e); }
  },
  getWorkTables: async (req, res, next) => {
    try { res.json(await AssignmentService.getWorkTables(req.user.companyId)); } catch (e) { next(e); }
  },
  getWorkTableBoard: async (req, res, next) => {
    try { res.json(await AssignmentService.getWorkTableBoard(req.user.companyId, req.user)); } catch (e) { next(e); }
  },
  assignWorkTable: async (req, res, next) => {
    try { res.json(await AssignmentService.assignWorkTable(req.body, req.user.companyId, req.user)); } catch (e) { next(e); }
  },
  getWorkTableMovements: async (req, res, next) => {
    try { res.json(await AssignmentService.getWorkTableMovements(Number(req.params.collaboratorId), req.user.companyId)); } catch (e) { next(e); }
  },
  createWorkTable: async (req, res, next) => {
    try { res.status(201).json(await AssignmentService.createWorkTable(req.body, req.user.companyId)); } catch (e) { next(e); }
  },
  getOperators: async (req, res, next) => {
    try { res.json(await AssignmentService.getOperators(req.user.companyId)); } catch (e) { next(e); }
  },
  getHistory: async (req, res, next) => {
    try { res.json(await AssignmentService.getHistory(Number(req.params.id), req.user.companyId)); } catch (e) { next(e); }
  },
  assign: async (req, res, next) => {
    try { res.status(201).json(await AssignmentService.assign(req.body, req.user.companyId, req.user.id)); } catch (e) { next(e); }
  },
  assignMany: async (req, res, next) => {
    try {
      const result = await AssignmentService.assignMany(req.body, req.user.companyId, req.user.id);
      res.status(201).json({ assigned: result.length });
    } catch (e) { next(e); }
  },
  endAssignment: async (req, res, next) => {
    try { res.json(await AssignmentService.endAssignment(Number(req.params.id), req.body, req.user.companyId)); } catch (e) { next(e); }
  },
};
