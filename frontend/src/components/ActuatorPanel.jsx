import React, { useState } from 'react';
import './ActuatorPanel.css';

export function ActuatorPanel({ currentReading }) {
  const temp = currentReading?.temperature ?? 24;
  const co2 = currentReading?.co2 ?? 480;
  const humidity = currentReading?.humidity ?? 72;

  // Auto-ON recommendation conditions
  const recommendFan = temp > 28;
  const recommendCooler = temp > 30;
  const recommendExhaust = co2 > 800;
  const recommendHumidifier = humidity < 60;

  const [toggles, setToggles] = useState({
    fan: false,
    cooler: false,
    exhaust: false,
    humidifier: false
  });

  const handleToggle = (key) => {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const actuators = [
    {
      key: 'fan',
      label: 'Cooling Fan',
      icon: '🌀',
      recommended: recommendFan,
      recReason: 'Temp > 28°C'
    },
    {
      key: 'cooler',
      label: 'Cooler Unit',
      icon: '❄️',
      recommended: recommendCooler,
      recReason: 'Temp > 30°C'
    },
    {
      key: 'exhaust',
      label: 'Exhaust Vent',
      icon: '🔃',
      recommended: recommendExhaust,
      recReason: 'CO₂ > 800 ppm'
    },
    {
      key: 'humidifier',
      label: 'Humidifier',
      icon: '💦',
      recommended: recommendHumidifier,
      recReason: 'Humidity < 60%'
    }
  ];

  return (
    <div className="actuator-panel-card">
      <div className="actuator-panel-header">
        <h3 className="actuator-panel-title">Automated Environment Controls</h3>
        <span className="actuator-badge">Relay Control</span>
      </div>

      <div className="actuator-list">
        {actuators.map((act) => {
          const isOn = toggles[act.key];

          return (
            <div
              key={act.key}
              className={`actuator-item ${act.recommended ? 'glow-recommended' : ''}`}
            >
              <div className="actuator-info">
                <span className="actuator-icon">{act.icon}</span>
                <div className="actuator-labels">
                  <span className="actuator-name">{act.label}</span>
                  {act.recommended && (
                    <span className="actuator-rec-badge" title={`Recommended ON (${act.recReason})`}>
                      ⚡ Recommended ON
                    </span>
                  )}
                </div>
              </div>

              <div className="actuator-switch-group">
                <button
                  type="button"
                  className={`actuator-toggle-btn ${isOn ? 'on' : 'off'}`}
                  onClick={() => handleToggle(act.key)}
                >
                  <span className="actuator-slider" />
                </button>
                <span className={`actuator-state-label ${isOn ? 'state-on' : 'state-off'}`}>
                  {isOn ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="actuator-footer">
        <p>ℹ️ In production, these outputs connect directly to 5V relay module channels.</p>
      </div>
    </div>
  );
}
