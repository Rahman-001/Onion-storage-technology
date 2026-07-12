require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const sensorRoutes = require('./routes/sensors');
const alertRoutes = require('./routes/alerts');
const sensorController = require('./controllers/sensorController');
const simulator = require('./services/simulator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Allow all origins for seamless dev/prod access
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'apiKey']
}));
app.use(express.json());

// API Routes
app.use('/api/sensors', sensorRoutes);
app.use('/api/alerts', alertRoutes);

// Mode Endpoints
app.get('/api/mode', sensorController.getMode);
app.post('/api/mode', sensorController.setMode);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    project: 'Onion Storage Monitor IoT',
    mode: simulator.getMode(),
    timestamp: new Date()
  });
});

// Root fallback
app.get('/', (req, res) => {
  res.send('Onion Storage Monitor API Backend Server is running.');
});

// MongoDB Connection & Server Startup
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onion_storage';

// Start simulator service immediately
simulator.startSimulator();

mongoose
  .connect(MONGODB_URI, { serverSelectionTimeoutMS: 3000 })
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas database');
  })
  .catch((err) => {
    console.log('[Notice] MongoDB connection skipped/offline:', err.message);
    console.log('[Notice] Backend is operating in 100% functional In-Memory mode.');
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
