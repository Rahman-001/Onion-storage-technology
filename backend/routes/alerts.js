const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');

router.get('/', alertController.getAlerts);
router.patch('/:id/acknowledge', alertController.acknowledgeAlert);
router.delete('/clear', alertController.clearAlerts);

module.exports = router;
