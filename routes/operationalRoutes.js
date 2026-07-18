const express = require('express');
const C = require('../controllers/OperationalController');
const auth = require('../middleware/authMiddleware');
const allow = require('../middleware/roleMiddleware');

const router = express.Router();
router.use(auth);

const view = allow('admin', 'rrhh', 'operaciones', 'supervisor', 'gerencia');
const manage = allow('admin', 'rrhh', 'operaciones', 'supervisor');

router.get('/shifts', view, C.getShifts);
router.post('/shifts', allow('admin', 'rrhh', 'operaciones'), C.createShift);
router.put('/shifts/:id', allow('admin', 'rrhh', 'operaciones'), C.updateShift);

router.get('/work-tables', view, C.getWorkTables);
router.get('/work-tables/board', manage, C.getWorkTableBoard);
router.get('/work-tables/history', view, C.getWorkTableDailyReport);
router.post('/work-tables/assign', manage, C.assignWorkTable);
router.get('/work-tables/movements/:collaboratorId', view, C.getWorkTableMovements);
router.post('/work-tables', manage, C.createWorkTable);

router.get('/assignments', view, C.getOperators);
router.get('/assignments/:id/history', view, C.getHistory);
router.post('/assignments', manage, C.assign);
router.post('/assignments/bulk', manage, C.assignMany);
router.put('/assignments/:id/end', manage, C.endAssignment);

module.exports = router;
