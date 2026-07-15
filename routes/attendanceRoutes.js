const express = require('express')
const C = require('../controllers/AttendanceController')
const auth = require('../middleware/authMiddleware')
const allow = require('../middleware/roleMiddleware')

const router = express.Router()
router.use(auth)

router.post('/scan', allow('colaborador'), C.scan)
router.get('/', allow('admin', 'rrhh', 'operaciones', 'supervisor', 'gerencia'), C.list)
router.post('/', allow('admin', 'supervisor'), C.start)
router.get('/report/general', allow('admin', 'rrhh', 'operaciones', 'gerencia'), C.generalReport)
router.get('/:id', allow('admin', 'rrhh', 'operaciones', 'supervisor', 'gerencia'), C.detail)
router.post('/:id/qr', allow('admin', 'supervisor'), C.qr)
router.post('/:id/scan-code', allow('admin', 'supervisor'), C.scanCode)
router.post('/:id/manual', allow('admin', 'supervisor'), C.manual)
router.patch('/:id/people/:collaboratorId/validation', allow('admin', 'supervisor'), C.validate)
router.post('/:id/close', allow('admin', 'supervisor'), C.close)
router.patch('/:id/review', allow('admin', 'rrhh'), C.review)

module.exports = router
