const mongoose = require('mongoose');
const Alert = require('../models/Alert');

const inMemoryAlerts = [];

async function checkThresholds(reading) {
  const { temperature, humidity, co2, weight, spoilageScore, source = 'demo' } = reading;
  const candidateAlerts = [];

  // 1. Temperature rules
  if (temperature > 32) {
    candidateAlerts.push({
      type: 'danger',
      sensor: 'temperature',
      message: `🌡️ Temperature critical at ${temperature}°C — risk of rapid spoilage`,
      value: temperature,
      threshold: 32
    });
  } else if (temperature > 28) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'temperature',
      message: `🌡️ Temperature elevated at ${temperature}°C — monitor closely`,
      value: temperature,
      threshold: 28
    });
  }

  // 2. Humidity rules
  if (humidity > 85) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'humidity',
      message: `💧 Humidity too high at ${humidity}% — mold risk`,
      value: humidity,
      threshold: 85
    });
  } else if (humidity < 55) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'humidity',
      message: `💧 Humidity too low at ${humidity}% — drying out`,
      value: humidity,
      threshold: 55
    });
  }

  // 3. CO2 rules
  if (co2 > 1000) {
    candidateAlerts.push({
      type: 'danger',
      sensor: 'co2',
      message: `💨 CO₂ critical at ${co2} ppm — ventilate immediately`,
      value: co2,
      threshold: 1000
    });
  } else if (co2 > 600) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'co2',
      message: `💨 CO₂ elevated at ${co2} ppm`,
      value: co2,
      threshold: 600
    });
  }

  // 4. Weight rules
  if (weight < 90) {
    candidateAlerts.push({
      type: 'danger',
      sensor: 'weight',
      message: `⚖️ Severe weight loss — ${weight}kg remaining`,
      value: weight,
      threshold: 90
    });
  } else if (weight < 95) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'weight',
      message: `⚖️ Weight loss detected — ${weight}kg remaining`,
      value: weight,
      threshold: 95
    });
  }

  // 5. Spoilage Score rules
  if (spoilageScore > 80) {
    candidateAlerts.push({
      type: 'danger',
      sensor: 'spoilageScore',
      message: `🧅 Spoilage risk CRITICAL — ${spoilageScore}% score`,
      value: spoilageScore,
      threshold: 80
    });
  } else if (spoilageScore > 60) {
    candidateAlerts.push({
      type: 'warning',
      sensor: 'spoilageScore',
      message: `🧅 Spoilage risk HIGH — ${spoilageScore}% score`,
      value: spoilageScore,
      threshold: 60
    });
  }

  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  const createdAlerts = [];

  for (const candidate of candidateAlerts) {
    try {
      // Check in-memory deduplication first
      const recentInMemory = inMemoryAlerts.find(
        (a) => a.sensor === candidate.sensor && a.type === candidate.type && new Date(a.timestamp) >= twoMinutesAgo
      );

      if (recentInMemory) {
        continue;
      }

      const alertObject = {
        _id: 'alert_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        ...candidate,
        source,
        acknowledged: false,
        timestamp: new Date()
      };

      inMemoryAlerts.unshift(alertObject);
      if (inMemoryAlerts.length > 50) {
        inMemoryAlerts.pop();
      }
      createdAlerts.push(alertObject);

      // Try saving to DB if Mongoose connected
      if (mongoose.connection.readyState === 1) {
        await Alert.create({ ...candidate, source });
      }
    } catch (err) {
      console.error('Error in alertService:', err.message);
    }
  }

  return createdAlerts;
}

module.exports = {
  checkThresholds,
  inMemoryAlerts
};
