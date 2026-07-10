const express = require('express');
const UserController = require('../controllers/UserController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

const router = express.Router();

// Proteger todas las rutas de usuarios
router.use(authMiddleware);

router.get('/', UserController.getUsers);
router.get('/:id', UserController.getUser);
router.post('/', roleMiddleware('admin', 'rrhh'), UserController.createUser);
router.put('/:id', adminMiddleware, UserController.updateUser);
router.put('/:id/password', adminMiddleware, UserController.changePassword);
router.delete('/:id', adminMiddleware, UserController.deleteUser);

module.exports = router;
