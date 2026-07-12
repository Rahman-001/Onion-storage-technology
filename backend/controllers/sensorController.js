const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');
const alertService = require('../services/alertService');
const simulator = require('../services/simulator');

/**
 * GET /api/sensors/latest
 */
exports.getLatestReading = async (req, res) => {
  try {
    const mode = simulator.getMode();
    const hardwareConnected = simulator.isHardwareConnected();

    // If live mode and hardware is NOT connected, do NOT return stale demo data as live readings
    if (mode === 'live' && !hardwareConnected) {
      return res.status(200).json(null);
    }

    if (mongoose.connection.readyState === 1) {
      const query = mode === 'live' ? { source: 'live' } : {};
      const reading = await SensorReading.findOne(query).sort({ timestamp: -1 });
      if (reading) {
        return res.status(200).json(reading);
      }
    }

    // Fallback to in-memory history
    const history = simulator.inMemoryHistory;
    if (mode === 'live') {
      const liveReadings = history.filter((r) => r.source === 'live');
      if (liveReadings.length > 0) {
        return res.status(200).json(liveReadings[liveReadings.length - 1]);
      }
      return res.status(200).json(null);
    }

    if (history.length > 0) {
      return res.status(200).json(history[history.length - 1]);
    }

    const last = simulator.getLastReading();
    return res.status(200).json({
      temperature: last.temperature,
      humidity: last.humidity,
      co2: last.co2,
      weight: last.weight,
      light: last.light,
      spoilageScore: 5.2,
      source: 'demo',
      deviceId: 'SIMULATOR',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error fetching latest reading:', error);
    return res.status(200).json(null);
  }
};

/**
 * GET /api/sensors/history?limit=N&source=demo|live|all
 */
exports.getHistory = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const sourceFilter = req.query.source;
    const mode = simulator.getMode();
    const hardwareConnected = simulator.isHardwareConnected();

    if (mode === 'live' && !hardwareConnected) {
      return res.status(200).json([]);
    }

    if (mongoose.connection.readyState === 1) {
      const query = {};
      const targetSource = sourceFilter || (mode === 'live' ? 'live' : 'all');
      if (targetSource !== 'all' && ['demo', 'live'].includes(targetSource)) {
        query.source = targetSource;
      }

      const readings = await SensorReading.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);

      if (readings && readings.length > 0) {
        return res.status(200).json(readings.reverse());
      }
    }

    let list = [...simulator.inMemoryHistory];
    const targetSource = sourceFilter || (mode === 'live' ? 'live' : 'all');
    if (targetSource !== 'all' && ['demo', 'live'].includes(targetSource)) {
      list = list.filter((r) => r.source === targetSource);
    }
    return res.status(200).json(list.slice(-limit));
  } catch (error) {
    console.error('Error fetching sensor history:', error);
    return res.status(200).json([]);
  }
};

/**
 * GET /api/sensors/stats
 */
exports.getStats = async (req, res) => {
  try {
    const list = simulator.inMemoryHistory;
    if (list.length === 0) {
      return res.status(200).json({
        count: 0,
        temperature: { min: 0, max: 0, avg: 0 },
        humidity: { min: 0, max: 0, avg: 0 },
        co2: { min: 0, max: 0, avg: 0 },
        weight: { min: 0, max: 0, avg: 0 },
        light: { min: 0, max: 0, avg: 0 },
        spoilageScore: { avg: 0 }
      });
    }

    const temps = list.map((r) => r.temperature);
    const hums = list.map((r) => r.humidity);
    const co2s = list.map((r) => r.co2);
    const weights = list.map((r) => r.weight);
    const lights = list.map((r) => r.light);
    const scores = list.map((r) => r.spoilageScore);

    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;

    return res.status(200).json({
      count: list.length,
      temperature: {
        min: Math.min(...temps),
        max: Math.max(...temps),
        avg: Math.round(avg(temps) * 10) / 10
      },
      humidity: {
        min: Math.min(...hums),
        max: Math.max(...hums),
        avg: Math.round(avg(hums) * 10) / 10
      },
      co2: {
        min: Math.min(...co2s),
        max: Math.max(...co2s),
        avg: Math.round(avg(co2s))
      },
      weight: {
        min: Math.min(...weights),
        max: Math.max(...weights),
        avg: Math.round(avg(weights) * 10) / 10
      },
      light: {
        min: Math.min(...lights),
        max: Math.max(...lights),
        avg: Math.round(avg(lights))
      },
      spoilageScore: {
        avg: Math.round(avg(scores) * 10) / 10
      }
    });
  } catch (error) {
    console.error('Error fetching sensor stats:', error);
    return res.status(500).json({ error: 'Failed to calculate sensor stats' });
  }
};

/**
 * POST /api/sensors/ingest
 */
exports.ingestSensorData = async (req, res) => {
  try {
    const { temperature, humidity, co2, weight, light, deviceId = 'UNIT-1', apiKey } = req.body;

    // Step 1 — Validate API key
    const requestKey = req.headers['x-api-key'] || req.headers['apikey'] || apiKey;
    const expectedKey = process.env.API_KEY || 'onion_storage_secret_key_2024';

    if (!requestKey || requestKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Step 2 — Validate all fields exist and are numbers
    if (
      temperature === undefined || temperature === null || isNaN(Number(temperature)) ||
      humidity === undefined || humidity === null || isNaN(Number(humidity)) ||
      co2 === undefined || co2 === null || isNaN(Number(co2)) ||
      weight === undefined || weight === null || isNaN(Number(weight)) ||
      light === undefined || light === null || isNaN(Number(light))
    ) {
      return res.status(400).json({
        error: 'Missing or invalid required numeric sensor fields (temperature, humidity, co2, weight, light)'
      });
    }

    const tempNum = Number(temperature);
    const humNum = Number(humidity);
    const co2Num = Number(co2);
    const weightNum = Number(weight);
    const lightNum = Number(light);

    // Step 3 — Validate plausible ranges
    if (
      tempNum < -10 || tempNum > 80 ||
      humNum < 0 || humNum > 100 ||
      co2Num < 100 || co2Num > 5000 ||
      weightNum < 0 || weightNum > 500 ||
      lightNum < 0 || lightNum > 10000
    ) {
      return res.status(400).json({ error: 'Sensor value out of plausible range' });
    }

    const spoilageScore = simulator.calculateSpoilageScore(tempNum, humNum, co2Num, weightNum);

    // Step 4 — Create live reading
    const readingData = {
      _id: 'live_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      temperature: tempNum,
      humidity: humNum,
      co2: co2Num,
      weight: weightNum,
      light: lightNum,
      spoilageScore,
      source: 'live',
      deviceId,
      timestamp: new Date()
    };

    // Step 5 — Call simulator.recordLiveData()
    simulator.recordLiveData(readingData);

    // Step 6 — Auto-switch mode to live if not already live
    simulator.setMode('live');

    if (mongoose.connection.readyState === 1) {
      await SensorReading.create({
        temperature: tempNum,
        humidity: humNum,
        co2: co2Num,
        weight: weightNum,
        light: lightNum,
        spoilageScore,
        source: 'live',
        deviceId,
        timestamp: readingData.timestamp
      });
    }

    // Step 7 — Run alertService
    await alertService.checkThresholds(readingData);

    // Step 8 — Return success response
    return res.status(201).json({
      success: true,
      spoilageScore,
      mode: 'live',
      reading: readingData
    });
  } catch (error) {
    console.error('Error ingesting live sensor data:', error);
    return res.status(500).json({ error: 'Failed to ingest sensor data' });
  }
};

/**
 * GET /api/mode
 */
exports.getMode = (req, res) => {
  const currentMode = simulator.getMode();
  const lastLiveData = simulator.getLastLiveTime();
  const hardwareConnected = simulator.isHardwareConnected();

  return res.status(200).json({
    mode: currentMode,
    lastLiveData,
    hardwareConnected
  });
};

/**
 * POST /api/mode
 */
exports.setMode = (req, res) => {
  const { mode } = req.body;
  if (!mode || !['demo', 'live'].includes(mode)) {
    return res.status(400).json({ error: "Invalid mode. Must be 'demo' or 'live'" });
  }

  simulator.setMode(mode);

  if (mode === 'live') {
    const connected = simulator.isHardwareConnected();
    if (!connected) {
      return res.status(200).json({
        mode: 'live',
        hardwareConnected: false,
        message: 'Waiting for hardware. Send data to POST /api/sensors/ingest'
      });
    }
    return res.status(200).json({
      mode: 'live',
      hardwareConnected: true
    });
  }

  // mode === 'demo'
  return res.status(200).json({
    mode: 'demo',
    hardwareConnected: false
  });
};
