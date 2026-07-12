import React from 'react';
import { useSensorData } from '../hooks/useSensorData';
import { THRESHOLDS } from '../utils/thresholds';
import { ModeToggle } from '../components/ModeToggle';
import { MetricCard } from '../components/MetricCard';
import { SensorChart } from '../components/SensorChart';
import { SpoilageScore } from '../components/SpoilageScore';
import { ActuatorPanel } from '../components/ActuatorPanel';
import { AlertLog } from '../components/AlertLog';
import './Dashboard.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function Dashboard() {
  const {
    current,
    history,
    alerts,
    mode,
    hardwareConnected,
    waitingForHardware,
    loading,
    error,
    lastUpdated,
    toggleMode,
    acknowledgeAlert,
    clearAlerts
  } = useSensorData();

  const isLive = mode === 'live';

  const timeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  const syncText = isLive && hardwareConnected ? `Live Sync · ${timeStr}` : `Sync: ${timeStr}`;

  return (
    <div className="dashboard-layout">
      {/* ERROR BANNER */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* HEADER ROW */}
      <header className="dashboard-header">
        <div className="header-brand">
          <span className="header-logo">🧅</span>
          <div className="header-titles">
            <h1 className="header-title">Onion Storage Monitor</h1>
            <span className="header-subtitle">
              Improved Onion Storage Technology · College IoT Project
            </span>
          </div>
        </div>

        <div className="header-center">
          <ModeToggle
            mode={mode}
            hardwareConnected={hardwareConnected}
            onToggle={toggleMode}
          />
        </div>

        <div className="header-status">
          <div className="connection-pill">
            <span className={`status-dot ${error ? 'dot-error' : isLive && !hardwareConnected ? 'dot-waiting' : 'dot-active'}`} />
            <span className="status-label">
              {error ? 'Disconnected' : isLive && !hardwareConnected ? 'Waiting for Hardware' : 'Live Sync'}
            </span>
          </div>
          <span className="last-sync-time">{syncText}</span>
        </div>
      </header>

      {/* WAITING FOR HARDWARE WARNING BANNER */}
      {waitingForHardware && (
        <div className="hardware-waiting-banner">
          <div className="banner-left-content">
            <div className="banner-title-row">
              <span className="banner-warning-icon">⚠️</span>
              <h3 className="banner-title">Waiting for hardware signal</h3>
            </div>
            <p className="banner-description">
              No data received from Arduino/Raspberry Pi yet. Make sure your device is powered on and posting to:
            </p>
            <div className="banner-code-box">
              POST {API_BASE_URL}/api/sensors/ingest
              <span className="banner-header-spec">Header: x-api-key: onion_storage_secret_key_2024</span>
            </div>
          </div>

          <div className="banner-action-right">
            <button
              type="button"
              className="switch-demo-btn"
              onClick={() => toggleMode('demo')}
            >
              Switch to Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* ROW 1: METRIC CARDS */}
      <section className="dashboard-metrics-grid">
        <MetricCard
          label={THRESHOLDS.temperature.label}
          icon={THRESHOLDS.temperature.icon}
          value={current?.temperature}
          unit={THRESHOLDS.temperature.unit}
          statusKey={THRESHOLDS.temperature.getStatus(current?.temperature)}
          idealText={THRESHOLDS.temperature.ideal}
          source={mode}
          isLive={isLive}
          waitingForHardware={waitingForHardware}
        />

        <MetricCard
          label={THRESHOLDS.humidity.label}
          icon={THRESHOLDS.humidity.icon}
          value={current?.humidity}
          unit={THRESHOLDS.humidity.unit}
          statusKey={THRESHOLDS.humidity.getStatus(current?.humidity)}
          idealText={THRESHOLDS.humidity.ideal}
          source={mode}
          isLive={isLive}
          waitingForHardware={waitingForHardware}
        />

        <MetricCard
          label={THRESHOLDS.co2.label}
          icon={THRESHOLDS.co2.icon}
          value={current?.co2}
          unit={THRESHOLDS.co2.unit}
          statusKey={THRESHOLDS.co2.getStatus(current?.co2)}
          idealText={THRESHOLDS.co2.ideal}
          source={mode}
          isLive={isLive}
          waitingForHardware={waitingForHardware}
        />

        <MetricCard
          label={THRESHOLDS.weight.label}
          icon={THRESHOLDS.weight.icon}
          value={current?.weight}
          unit={THRESHOLDS.weight.unit}
          statusKey={THRESHOLDS.weight.getStatus(current?.weight)}
          idealText={THRESHOLDS.weight.ideal}
          source={mode}
          isLive={isLive}
          waitingForHardware={waitingForHardware}
        />
      </section>

      {/* ROW 2: CHART + SPOILAGE SCORE + ACTUATORS */}
      <section className="dashboard-analytics-grid">
        <div className="grid-col-chart">
          <SensorChart
            history={history}
            isLive={isLive}
            waitingForHardware={waitingForHardware}
          />
        </div>
        <div className="grid-col-score">
          <SpoilageScore
            score={waitingForHardware ? undefined : current?.spoilageScore}
            lastUpdated={waitingForHardware ? null : lastUpdated}
            waitingForHardware={waitingForHardware}
          />
        </div>
        <div className="grid-col-actuators">
          <ActuatorPanel currentReading={waitingForHardware ? null : current} />
        </div>
      </section>

      {/* ROW 3: ALERT LOG */}
      <section className="dashboard-alerts-section">
        <AlertLog alerts={alerts} onClear={clearAlerts} onAcknowledge={acknowledgeAlert} />
      </section>

      {/* FOOTER */}
      <footer className="dashboard-footer">
        <p>
          Unit: Tiruppur Storage Unit 1 · Project: Improved Onion Storage Technology · Mode:{' '}
          <strong>{mode.toUpperCase()}</strong> · Sync: {timeStr}
        </p>
      </footer>
    </div>
  );
}
