const mongoose = require('mongoose');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

const INITIAL_READING = {
  temperature: 20.0,
  humidity: 70.0,
  co2: 450,
  weight: 100.0,
  light: 40
};

const runSimulation = async () => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let latest = null;

    if (isDbConnected) {
      latest = await SensorReading.findOne().sort({ timestamp: -1 });
    } else {
      latest = global.inMemoryReadings[global.inMemoryReadings.length - 1];
    }

    if (!latest) {
      latest = INITIAL_READING;
    }

    // 2. Closed-loop Actuator Telemetry Simulation
    const actuators = global.actuators || { fan: true, cooler: false, vent: false, humidifier: false };
    
    // Temperature simulation
    let tempChange = 0;
    if (actuators.cooler) {
      // Cooling active: drive down towards 12°C target
      if (latest.temperature > 12) {
        tempChange = - (Math.random() * 0.6 + 0.4);
      } else {
        tempChange = (Math.random() * 0.2 - 0.1); // stable
      }
    } else if (actuators.fan) {
      // Fan only: circulates air, slight cooling down towards 22°C ambient
      if (latest.temperature > 22) {
        tempChange = - (Math.random() * 0.2 + 0.05);
      } else if (latest.temperature < 20) {
        tempChange = (Math.random() * 0.2 + 0.05);
      } else {
        tempChange = (Math.random() * 0.2 - 0.1);
      }
    } else {
      // Ambient heat: room heats up slowly towards 32°C
      if (latest.temperature < 32) {
        tempChange = (Math.random() * 0.3 + 0.1);
      } else {
        tempChange = (Math.random() * 0.2 - 0.1);
      }
    }

    // Humidity simulation
    let humChange = 0;
    if (actuators.humidifier) {
      // Humidifier active: drive up towards 75%
      if (latest.humidity < 75) {
        humChange = (Math.random() * 1.5 + 0.5);
      } else {
        humChange = (Math.random() * 0.6 - 0.3);
      }
    } else {
      // No humidifier: humidity drops or stays low depending on ventilation
      const dropRate = actuators.fan || actuators.vent ? 0.8 : 0.3;
      if (latest.humidity > 52) {
        humChange = - (Math.random() * dropRate + 0.1);
      } else {
        humChange = (Math.random() * 0.4 - 0.2);
      }
    }

    // CO2 simulation
    let co2Change = 0;
    if (actuators.vent) {
      // Exhaust vent open: drive down towards 400 ppm baseline
      if (latest.co2 > 400) {
        const ventRate = actuators.fan ? 65 : 40;
        co2Change = - (Math.random() * ventRate + 15);
      } else {
        co2Change = (Math.random() * 10 - 5);
      }
    } else {
      // Vent closed: CO2 builds up due to onion respiration
      const accumulationRate = actuators.fan ? 15 : 25;
      if (latest.co2 < 1200) {
        co2Change = (Math.random() * accumulationRate + 5);
      } else {
        co2Change = (Math.random() * 20 - 15);
      }
    }

    // Weight desiccation: depends on humidity and temperature
    let weightChange = 0;
    if (latest.humidity >= 60 && latest.humidity <= 80) {
      // Optimal conditions: very low moisture loss
      weightChange = - (Math.random() * 0.003 + 0.001);
    } else if (latest.humidity < 55) {
      // Dry air: high desiccation rate
      weightChange = - (Math.random() * 0.02 + 0.01);
    } else {
      // Mild desiccation
      weightChange = - (Math.random() * 0.008 + 0.002);
    }
    // High temperature increases desiccation further
    if (latest.temperature > 30) {
      weightChange *= 1.8;
    }

    // Light simulation: simple small random drift
    const lightChange = (Math.random() * 10 - 5);

    let nextTemp = Math.max(8, Math.min(40, latest.temperature + tempChange));
    let nextHum = Math.max(50, Math.min(95, latest.humidity + humChange));
    let nextCo2 = Math.max(350, Math.min(1400, Math.round(latest.co2 + co2Change)));
    let nextWeight = Math.max(80, Math.min(100, latest.weight + weightChange));
    let nextLight = Math.max(0, Math.min(800, Math.round(latest.light + lightChange)));

    // 3. Spoilage score
    let score = 0;
    if (nextTemp > 30) score += ((nextTemp - 30) / 10) * 40;
    if (nextHum > 85) score += ((nextHum - 85) / 15) * 25;
    if (nextHum < 60) score += ((60 - nextHum) / 10) * 20;
    if (nextCo2 > 800) score += ((nextCo2 - 800) / 600) * 25;
    score += (100 - nextWeight) * 0.5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const readingData = {
      temperature: Number(nextTemp.toFixed(2)),
      humidity: Number(nextHum.toFixed(2)),
      co2: nextCo2,
      weight: Number(nextWeight.toFixed(3)),
      light: nextLight,
      spoilageScore: score,
      timestamp: new Date()
    };

    if (isDbConnected) {
      const newReading = new SensorReading(readingData);
      await newReading.save();
    } else {
      readingData._id = Math.random().toString(36).substring(2, 9);
      global.inMemoryReadings.push(readingData);
      if (global.inMemoryReadings.length > 100) {
        global.inMemoryReadings.shift();
      }
    }

    console.log(`[Simulator] Generated telemetry: Temp=${readingData.temperature}°C, Hum=${readingData.humidity}%, CO2=${readingData.co2}ppm, Weight=${readingData.weight}kg, Spoilage=${readingData.spoilageScore}% [DB=${isDbConnected ? 'CONNECTED' : 'MOCKED'}]`);

    // 5. Evaluate and auto-create alerts
    const checkAlert = async (sensorName, isDanger, isWarning, dangerMsg, warningMsg, currentValue) => {
      let type = null;
      let msg = null;
      
      if (isDanger) {
        type = 'danger';
        msg = dangerMsg;
      } else if (isWarning) {
        type = 'warning';
        msg = warningMsg;
      }

      if (type) {
        if (isDbConnected) {
          const existingAlert = await Alert.findOne({
            sensor: sensorName,
            type: type,
            acknowledged: false
          });

          if (!existingAlert) {
            const newAlert = new Alert({
              type,
              message: msg,
              sensor: sensorName,
              value: Number(currentValue.toFixed(2)),
              acknowledged: false
            });
            await newAlert.save();
            console.log(`[Alert System] Created DB ${type} alert for ${sensorName}: ${msg}`);
          }
        } else {
          const existingAlert = global.inMemoryAlerts.find(
            a => a.sensor === sensorName && a.type === type && !a.acknowledged
          );

          if (!existingAlert) {
            const newAlert = {
              _id: Math.random().toString(36).substring(2, 9),
              type,
              message: msg,
              sensor: sensorName,
              value: Number(currentValue.toFixed(2)),
              timestamp: new Date(),
              acknowledged: false
            };
            global.inMemoryAlerts.unshift(newAlert);
            if (global.inMemoryAlerts.length > 50) {
              global.inMemoryAlerts.pop();
            }
            console.log(`[Alert System] Created Mock ${type} alert for ${sensorName}: ${msg}`);
          }
        }
      }
    };

    // Temperature Check
    await checkAlert(
      'temperature',
      nextTemp > 32,
      nextTemp > 28 && nextTemp <= 32,
      `CRITICAL: Temperature reaches ${nextTemp.toFixed(1)}°C, exceeding safety limit of 32.0°C!`,
      `WARNING: Temperature reaches ${nextTemp.toFixed(1)}°C, exceeding ideal limit of 28.0°C.`,
      nextTemp
    );

    // CO2 Check
    await checkAlert(
      'co2',
      nextCo2 > 1000,
      nextCo2 > 600 && nextCo2 <= 1000,
      `CRITICAL: CO₂ level climbs to ${nextCo2} ppm, indicating poor ventilation and high rot risk!`,
      `WARNING: CO₂ level is elevated at ${nextCo2} ppm. check exhaust systems.`,
      nextCo2
    );

    // Humidity Check
    await checkAlert(
      'humidity',
      false, // no danger condition specified for humidity, warning only
      nextHum < 55 || nextHum > 85,
      null,
      `WARNING: Humidity is at ${nextHum.toFixed(1)}%, violating the optimal 55%–85% safety boundary.`,
      nextHum
    );

    // Weight Check
    await checkAlert(
      'weight',
      nextWeight < 90,
      false,
      `CRITICAL: Onion moisture desiccation limits exceeded! Retained mass has dropped to ${nextWeight.toFixed(2)} kg (Under 90.0 kg).`,
      null,
      nextWeight
    );

  } catch (err) {
    console.error('[Simulator Error] Failed to generate/evaluate mock sensor reading:', err);
  }
};

module.exports = { runSimulation };
