const express = require('express');
const CollaboratorController = require('../controllers/CollaboratorController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const photoUpload = require('../middleware/collaboratorPhotoUpload');

const router = express.Router();
router.use(authMiddleware);
router.get('/', roleMiddleware('admin', 'rrhh', 'operaciones', 'supervisor', 'contabilidad', 'gerencia'), CollaboratorController.getAll);
router.get('/:id/photo', roleMiddleware('admin', 'rrhh', 'operaciones', 'supervisor', 'contabilidad', 'gerencia'), CollaboratorController.getPhoto);
router.put('/:id/photo', roleMiddleware('admin', 'rrhh'), photoUpload.single('photo'), CollaboratorController.updatePhoto);
router.get('/:id', roleMiddleware('admin', 'rrhh', 'operaciones', 'supervisor', 'contabilidad', 'gerencia'), CollaboratorController.getById);
router.post('/', roleMiddleware('admin', 'rrhh'), CollaboratorController.create);
router.put('/:id', roleMiddleware('admin', 'rrhh'), CollaboratorController.update);
module.exports = router;
