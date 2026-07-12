# Onion Storage Monitor — Improved Onion Storage Technology IoT Application

A complete full-stack IoT web application designed for the **"Improved Onion Storage Technology"** college project. It features real-time environmental monitoring, spoilage risk forecasting, automated control suggestions, alert diagnostics, and dual operational modes (**DEMO MODE** for presentation simulation & **LIVE MODE** for physical hardware integration via Arduino / Raspberry Pi).

---

## 🌟 Key Features

1. **Dual Operational Modes**:
   - **DEMO MODE**: Automatically simulates realistic random-walk sensor telemetry (Temperature, Humidity, CO₂, Weight loss, Light level) every 3 seconds via `node-cron`. Perfect for live college project demonstrations without hardware.
   - **LIVE MODE**: Ingests real sensor data via encrypted HTTP POST requests from Arduino Uno / ESP8266 / ESP32 or Raspberry Pi.
   - **Auto-Switch & Fallback**: Automatically switches to LIVE mode when hardware posts data, and falls back to DEMO mode if no hardware readings arrive for 30 seconds.

2. **Real-Time Spoilage Risk Engine**:
   - Computes a dynamic 0–100% onion spoilage score based on elevated temperature, humidity extremes, high CO₂ concentration, and progressive weight shrinkage.

3. **Smart Alert & Diagnostic System**:
   - Instant threshold alerts with 2-minute deduplication to prevent alert spamming.
   - User acknowledgement and bulk clear capabilities.

4. **Interactive Actuator Panel**:
   - Visual control panel with automated ON suggestions for Cooling Fan, Cooler, Exhaust Vent, and Humidifier based on environmental conditions.

---

## 📂 Project Structure

```text
onion-storage/
├── backend/
│   ├── server.js              ← Express server & MongoDB setup
│   ├── .env                   ← Environment variables
│   ├── package.json
│   ├── models/
│   │   ├── SensorReading.js   ← Mongoose schema with 7-day TTL index
│   │   └── Alert.js           ← Mongoose schema for diagnostics
│   ├── routes/
│   │   ├── sensors.js         ← Endpoints: /latest, /history, /stats, /ingest
│   │   └── alerts.js          ← Endpoints: /, /:id/acknowledge, /clear
│   ├── controllers/
│   │   ├── sensorController.js
│   │   └── alertController.js
│   └── services/
│       ├── simulator.js        ← DEMO simulator & live mode manager
│       └── alertService.js     ← Threshold checking & deduplication
│
└── frontend/
    ├── package.json
    ├── .env                   ← VITE_API_URL configuration
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css          ← Global light theme styles
        ├── components/
        │   ├── MetricCard.jsx
        │   ├── SensorChart.jsx
        │   ├── SpoilageScore.jsx
        │   ├── ActuatorPanel.jsx
        │   ├── AlertLog.jsx
        │   └── ModeToggle.jsx
        ├── pages/
        │   └── Dashboard.jsx
        ├── hooks/
        │   └── useSensorData.js
        └── utils/
            └── thresholds.js
```

---

## 🔌 Hardware Integration Guide (LIVE MODE)

### 📌 Wiring Diagram & Pin Connections

| Sensor | Module / Pin | Microcontroller Pin | Function |
|---|---|---|---|
| **DHT22** | VCC, GND, DATA | Digital Pin 2 | Temperature (°C) & Relative Humidity (%) |
| **MQ135** | VCC, GND, AOUT | Analog Pin A0 | Air Quality / CO₂ Estimation (ppm) |
| **HX711** | DT, SCK, VCC, GND | Digital Pins 4 & 5 | Load Cell for Onion Weight (kg) |
| **LDR** | VCC, GND, AOUT | Analog Pin A1 | Ambient Light Level (lux) |
| **Relays** | IN1, IN2, IN3, IN4 | Digital Pins 7, 8, 9, 10 | Actuator Control Outputs |

---

### 🤖 1. Arduino Sketch (C++ / ESP8266 / ESP32 / Arduino WiFi)

Upload the following code to your Arduino / ESP board to stream live telemetry to the cloud backend:

```cpp
#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClientSecure.h>
#include <DHT.h>
#include "HX711.h"

// WiFi Credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Backend API Details
const char* serverUrl = "https://your-backend.onrender.com/api/sensors/ingest";
const char* apiKey = "onion_storage_secret_key_2024";

// Pin Definitions
#define DHTPIN 2
#define DHTTYPE DHT22
#define MQ135_PIN A0
#define HX711_DOUT 4
#define HX711_SCK 5
#define LDR_PIN A1

DHT dht(DHTPIN, DHTTYPE);
HX711 scale;

void setup() {
  Serial.begin(115200);
  dht.begin();
  scale.begin(HX711_DOUT, HX711_SCK);
  scale.set_scale(2280.f); // Calibration factor
  scale.tare();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClientSecure client;
    client.setInsecure(); // Skip SSL cert validation for prototype
    HTTPClient http;

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    
    // MQ135 analog read mapped to ppm estimate
    int mqAnalog = analogRead(MQ135_PIN);
    float co2Ppm = map(mqAnalog, 0, 1023, 350, 2000);

    // HX711 Load Cell weight read
    float weightKg = scale.get_units(5);
    if (weightKg < 0) weightKg = 0;

    // LDR Light read
    int ldrAnalog = analogRead(LDR_PIN);
    float lightLux = map(ldrAnalog, 0, 1023, 0, 1000);

    if (isnan(temp) || isnan(hum)) {
      Serial.println("Failed to read from DHT sensor!");
      delay(3000);
      return;
    }

    http.begin(client, serverUrl);
    http.addHeader("Content-Type", "application/json");

    String jsonPayload = "{";
    jsonPayload += "\"temperature\":" + String(temp, 1) + ",";
    jsonPayload += "\"humidity\":" + String(hum, 1) + ",";
    jsonPayload += "\"co2\":" + String(co2Ppm, 0) + ",";
    jsonPayload += "\"weight\":" + String(weightKg, 1) + ",";
    jsonPayload += "\"light\":" + String(lightLux, 0) + ",";
    jsonPayload += "\"deviceId\":\"UNIT-1\",";
    jsonPayload += "\"apiKey\":\"" + String(apiKey) + "\"";
    jsonPayload += "}";

    int httpResponseCode = http.POST(jsonPayload);
    
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("HTTP Response Code: " + String(httpResponseCode));
      Serial.println("Response: " + response);
    } else {
      Serial.println("Error on sending POST: " + String(httpResponseCode));
    }

    http.end();
  }

  delay(5000); // Send data every 5 seconds
}
```

---

### 🐍 2. Raspberry Pi Python Client Script

Save and run this Python script on your Raspberry Pi:

```python
import time
import requests
import Adafruit_DHT
import RPi.GPIO as GPIO

# API Config
SERVER_URL = "https://your-backend.onrender.com/api/sensors/ingest"
API_KEY = "onion_storage_secret_key_2024"
DEVICE_ID = "RASPBERRY-PI-UNIT-1"

# DHT Sensor Configuration
DHT_SENSOR = Adafruit_DHT.DHT22
DHT_PIN = 4

def read_sensors():
    humidity, temperature = Adafruit_DHT.read_retry(DHT_SENSOR, DHT_PIN)
    
    # Mocking ADC reads for analog sensors (MQ135 & Load Cell via MCP3008 if needed)
    co2_ppm = 450.0
    weight_kg = 97.5
    light_lux = 45.0

    return {
        "temperature": round(temperature, 1) if temperature else 25.0,
        "humidity": round(humidity, 1) if humidity else 70.0,
        "co2": co2_ppm,
        "weight": weight_kg,
        "light": light_lux,
        "deviceId": DEVICE_ID,
        "apiKey": API_KEY
    }

def main():
    print("Starting Raspberry Pi Telemetry Node...")
    while True:
        try:
            payload = read_sensors()
            response = requests.post(SERVER_URL, json=payload, timeout=5)
            if response.status_code == 201 or response.status_code == 200:
                print(f"[SUCCESS] Ingested: {response.json()}")
            else:
                print(f"[ERROR] HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[EXCEPTION] Failed to send telemetry: {e}")
        
        time.sleep(5)

if __name__ == "__main__":
    main()
```

---

## 🚀 Step-by-Step Deployment Instructions

### STEP 1 — Database: MongoDB Atlas (Free Tier)
1. Navigate to [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a free M0 cluster.
2. In **Database Access**, create a database user (e.g. `onion_admin` / password).
3. In **Network Access**, add IP `0.0.0.0/0` (allows Render backend to connect).
4. Click **Connect** → **Drivers** → Copy connection string.
5. Replace `<password>` in connection string and place into `backend/.env` under `MONGODB_URI`.

### STEP 2 — Backend Deployment: Render
1. Sign in to [render.com](https://render.com) → **New** → **Web Service**.
2. Connect your GitHub repository containing the `backend/` directory.
3. Configure settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Instance Type**: Free
4. Add Environment Variables:
   - `MONGODB_URI` = your Atlas connection string
   - `PORT` = `5000`
   - `API_KEY` = `onion_storage_secret_key_2024`
   - `DEFAULT_MODE` = `demo`
   - `FRONTEND_URL` = `https://your-app.vercel.app`
5. Click **Deploy** and copy your backend URL (`https://your-app.onrender.com`).

### STEP 3 — Frontend Deployment: Vercel
1. Sign in to [vercel.com](https://vercel.com) → **Add New Project** → Import repository.
2. Settings:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
3. Environment Variables:
   - `VITE_API_URL` = `https://your-app.onrender.com`
4. Click **Deploy**.
5. Copy your live Vercel URL and update `FRONTEND_URL` in your Render environment variables.

---

## 🛠️ Troubleshooting Guide

- **CORS Errors**: Ensure `FRONTEND_URL` in `backend/.env` matches your Vercel deployment URL exactly (including `https://`).
- **MongoDB Connection Failure**: Verify that `0.0.0.0/0` is allowed in Atlas Network Access and database username/password are URL encoded if they contain special characters.
- **Sensor Calibration**: HX711 load cell calibration requires zeroing (`scale.tare()`) with an empty container before loading onions.

---

## 🎨 Dashboard Preview Description

The Onion Storage Monitor interface features:
- **Header**: Branding logo, Mode Toggle switch (DEMO / LIVE pill), and active WebSocket/polling sync dot.
- **Metrics Grid**: 4 prominent cards displaying live Temperature, Humidity, CO₂ levels, and Weight Retained with ideal ranges and status pill badges.
- **Analytics Row**:
  - Recharts smooth telemetry trends graph.
  - SVG Circular Spoilage Risk meter (Fresh 🟢 / Monitor 🟡 / High Risk 🟠 / Spoiling 🔴).
  - Actuator Panel with smart yellow recommendation glows when thresholds breach.
- **Diagnostic Alert Log**: Filterable list of alerts with single-click acknowledgement and clear options.
