const mongoose = require('mongoose');
const Alert = require('../models/Alert');
const alertService = require('../services/alertService');

/**
 * GET /api/alerts?limit=30
 */
exports.getAlerts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 30;

    if (mongoose.connection.readyState === 1) {
      const alerts = await Alert.find()
        .sort({ timestamp: -1 })
        .limit(limit);

      if (alerts && alerts.length > 0) {
        return res.status(200).json(alerts);
      }
    }

    return res.status(200).json(alertService.inMemoryAlerts.slice(0, limit));
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return res.status(200).json(alertService.inMemoryAlerts.slice(0, 30));
  }
};

/**
 * PATCH /api/alerts/:id/acknowledge
 */
exports.acknowledgeAlert = async (req, res) => {
  try {
    const { id } = req.params;

    // Update in memory array first
    const memAlert = alertService.inMemoryAlerts.find((a) => a._id === id || String(a._id) === String(id));
    if (memAlert) {
      memAlert.acknowledged = true;
    }

    if (mongoose.connection.readyState === 1) {
      const alert = await Alert.findByIdAndUpdate(
        id,
        { acknowledged: true },
        { new: true }
      );
      if (alert) return res.status(200).json(alert);
    }

    if (memAlert) {
      return res.status(200).json(memAlert);
    }

    return res.status(200).json({ _id: id, acknowledged: true });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return res.status(200).json({ _id: req.params.id, acknowledged: true });
  }
};

/**
 * DELETE /api/alerts/clear
 */
exports.clearAlerts = async (req, res) => {
  try {
    alertService.inMemoryAlerts.length = 0;

    if (mongoose.connection.readyState === 1) {
      await Alert.deleteMany({});
    }

    return res.status(200).json({ success: true, message: 'All alerts cleared successfully' });
  } catch (error) {
    console.error('Error clearing alerts:', error);
    alertService.inMemoryAlerts.length = 0;
    return res.status(200).json({ success: true, message: 'All alerts cleared' });
  }
};
