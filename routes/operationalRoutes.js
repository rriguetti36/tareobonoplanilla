const express=require('express'),C=require('../controllers/OperationalController'),auth=require('../middleware/authMiddleware'),allow=require('../middleware/roleMiddleware');
const router=express.Router();router.use(auth);const view=allow('admin','rrhh','operaciones','supervisor','gerencia'),manage=allow('admin','rrhh','operaciones');
router.get('/shifts',view,C.getShifts);router.post('/shifts',manage,C.createShift);router.put('/shifts/:id',manage,C.updateShift);
router.get('/assignments',view,C.getOperators);router.get('/assignments/:id/history',view,C.getHistory);router.post('/assignments',manage,C.assign);
router.post('/assignments/bulk',manage,C.assignMany);
router.put('/assignments/:id/end',manage,C.endAssignment);
module.exports=router;
