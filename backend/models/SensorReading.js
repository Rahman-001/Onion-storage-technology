const mongoose = require('mongoose');

const sensorReadingSchema = new mongoose.Schema(
  {
    temperature: {
      type: Number,
      required: true
    },
    humidity: {
      type: Number,
      required: true
    },
    co2: {
      type: Number,
      required: true
    },
    weight: {
      type: Number,
      required: true
    },
    light: {
      type: Number,
      required: true
    },
    spoilageScore: {
      type: Number,
      required: true
    },
    source: {
      type: String,
      enum: ['demo', 'live'],
      default: 'demo'
    },
    deviceId: {
      type: String,
      default: 'SIMULATOR'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Index for query optimization on timestamp (newest first)
sensorReadingSchema.index({ timestamp: -1 });

// TTL index to automatically remove sensor readings older than 7 days (604,800 seconds)
sensorReadingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('SensorReading', sensorReadingSchema);
