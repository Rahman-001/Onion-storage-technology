const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['danger', 'warning', 'info'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    sensor: {
      type: String,
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    threshold: {
      type: Number,
      required: true
    },
    source: {
      type: String,
      enum: ['demo', 'live'],
      default: 'demo'
    },
    acknowledged: {
      type: Boolean,
      default: false
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

alertSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Alert', alertSchema);
