const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { auth } = require('../middleware/auth');

// Priority Data Management routes
router.get('/backup', auth, settingsController.backupData);
router.post('/restore', auth, settingsController.restoreData);
router.post('/wipe', auth, settingsController.wipeData);

// Main settings routes
router.get('/', auth, settingsController.getSettings);
router.put('/', auth, settingsController.updateSettings);

// Time slot routes
router.get('/slots', auth, settingsController.getTimeSlots);
router.post('/slots', auth, settingsController.createTimeSlot);
router.put('/slots/:id', auth, settingsController.updateTimeSlot);
router.delete('/slots/:id', auth, settingsController.deleteTimeSlot);

module.exports = router;
