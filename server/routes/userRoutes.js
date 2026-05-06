const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { auth, superAdmin } = require('../middleware/auth');

router.get('/', auth, superAdmin, userController.getAllUsers);
router.get('/:id', auth, userController.getUserById);
router.put('/:id', auth, userController.updateProfile);
router.put('/:id/status', auth, superAdmin, userController.updateStatus);
router.put('/:id/password', auth, userController.updatePassword);
router.post('/', auth, superAdmin, userController.createUser);

module.exports = router;
