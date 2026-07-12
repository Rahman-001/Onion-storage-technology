const express = require('express');
const router = express.Router();

// GET /api/actuators
router.get('/', (req, res) => {
  try {
    // Return current actuators state
    res.json(global.actuators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/actuators/toggle
router.post('/toggle', (req, res) => {
  try {
    const { key } = req.body;
    if (!key || !(key in global.actuators)) {
      return res.status(400).json({ error: 'Invalid actuator key' });
    }
    
    // Toggle the actuator
    global.actuators[key] = !global.actuators[key];
    console.log(`[Actuator System] Toggled ${key} to ${global.actuators[key] ? 'ON' : 'OFF'}`);
    
    res.json(global.actuators);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
