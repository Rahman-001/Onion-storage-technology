const cron = require('node-cron');
const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');
const alertService = require('./alertService');

let currentMode = process.env.DEFAULT_MODE || 'demo';
let lastLiveDataTime = null;
let simulatorJob = null;
let fallbackTimeout = null;

let lastReading = {
  temperature: 24,
  humidity: 72,
  co2: 480,
  weight: 98.5,
  light: 30
};

// In-Memory history array fallback
const inMemoryHistory = [];

function calculateSpoilageScore(temp, humidity, co2, weight) {
  let score = 0;
  if (temp > 30) {
    score += ((temp - 30) / 10) * 40;
  }
  if (humidity > 85) {
    score += ((humidity - 85) / 15) * 25;
  }
  if (humidity < 60) {
    score += ((60 - humidity) / 10) * 20;
  }
  if (co2 > 800) {
    score += ((co2 - 800) / 600) * 25;
  }
  score += (100 - weight) * 0.5;

  score = Math.min(100, Math.max(0, score));
  return Math.round(score * 10) / 10;
}

function clamp(val, min, max) {
  return Math.min(max, Math.max(min, val));
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

function generateNextDemoReading() {
  const tempDelta = (Math.random() * 2 - 1) * 1.0;
  const humDelta = (Math.random() * 2 - 1) * 1.5;
  const co2Delta = (Math.random() * 2 - 1) * 30;
  const weightLoss = Math.random() * 0.05;
  const lightDelta = (Math.random() * 2 - 1) * 10;

  lastReading.temperature = round1(clamp(lastReading.temperature + tempDelta, 8, 40));
  lastReading.humidity = round1(clamp(lastReading.humidity + humDelta, 50, 95));
  lastReading.co2 = Math.round(clamp(lastReading.co2 + co2Delta, 350, 1400));
  lastReading.weight = round1(clamp(lastReading.weight - weightLoss, 80, 100));
  lastReading.light = Math.round(clamp(lastReading.light + lightDelta, 0, 800));

  const spoilageScore = calculateSpoilageScore(
    lastReading.temperature,
    lastReading.humidity,
    lastReading.co2,
    lastReading.weight
  );

  return {
    _id: 'mem_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    ...lastReading,
    spoilageScore,
    source: 'demo',
    deviceId: 'SIMULATOR',
    timestamp: new Date()
  };
}

function recordLiveData(reading) {
  lastLiveDataTime = Date.now();
  currentMode = 'live';

  if (reading) {
    lastReading = {
      temperature: reading.temperature,
      humidity: reading.humidity,
      co2: reading.co2,
      weight: reading.weight,
      light: reading.light
    };

    inMemoryHistory.push(reading);
    if (inMemoryHistory.length > 100) {
      inMemoryHistory.shift();
    }
  }

  // Stop simulator when live data is active
  if (simulatorJob) {
    simulatorJob.stop();
  }

  // Reset 30s fallback timer
  if (fallbackTimeout) {
    clearTimeout(fallbackTimeout);
  }

  fallbackTimeout = setTimeout(() => {
    console.log('No hardware data received for 30s — falling back to DEMO mode');
    setMode('demo');
  }, 30000);
}

function isHardwareConnected() {
  if (!lastLiveDataTime) return false;
  return Date.now() - lastLiveDataTime < 10000; // true only if data received within last 10 seconds
}

function startSimulator() {
  console.log(`[Simulator Service] Initialized. Starting in mode: ${currentMode}`);

  simulatorJob = cron.schedule('*/3 * * * * *', async () => {
    if (currentMode !== 'demo') {
      return;
    }

    try {
      const demoData = generateNextDemoReading();

      inMemoryHistory.push(demoData);
      if (inMemoryHistory.length > 100) {
        inMemoryHistory.shift();
      }

      if (mongoose.connection.readyState === 1) {
        await SensorReading.create(demoData);
      }

      await alertService.checkThresholds(demoData);
    } catch (err) {
      console.error('[Simulator Error]:', err.message);
    }
  });

  if (currentMode !== 'demo') {
    simulatorJob.stop();
  }
}

function getMode() {
  return currentMode;
}

function getLastLiveTime() {
  return lastLiveDataTime;
}

function setMode(mode) {
  if (mode === 'demo' || mode === 'live') {
    currentMode = mode;
    if (mode === 'live') {
      if (simulatorJob) {
        simulatorJob.stop();
      }
    } else if (mode === 'demo') {
      if (fallbackTimeout) {
        clearTimeout(fallbackTimeout);
        fallbackTimeout = null;
      }
      if (simulatorJob) {
        simulatorJob.start();
      }
    }
  }
  return currentMode;
}

module.exports = {
  startSimulator,
  getMode,
  setMode,
  getLastLiveTime,
  recordLiveData,
  isHardwareConnected,
  calculateSpoilageScore,
  getLastReading: () => lastReading,
  inMemoryHistory
};
