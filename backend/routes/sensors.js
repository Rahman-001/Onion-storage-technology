const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');

router.get('/latest', sensorController.getLatestReading);
router.get('/history', sensorController.getHistory);
router.get('/stats', sensorController.getStats);
router.post('/ingest', sensorController.ingestSensorData);

module.exports = router;
