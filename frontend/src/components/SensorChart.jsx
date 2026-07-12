import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './SensorChart.css';

const TABS = [
  { key: 'temperature', label: 'Temp', unit: '°C', color: '#ef4444' },
  { key: 'humidity', label: 'Humidity', unit: '%', color: '#3b82f6' },
  { key: 'co2', label: 'CO₂', unit: 'ppm', color: '#8b5cf6' },
  { key: 'weight', label: 'Weight', unit: 'kg', color: '#16a34a' }
];

export function SensorChart({ history = [], isLive = false, waitingForHardware = false }) {
  const [activeTabKey, setActiveTabKey] = useState('temperature');

  const activeTab = TABS.find((t) => t.key === activeTabKey) || TABS[0];

  const chartData = (history || []).slice(-20).map((item) => {
    const date = new Date(item.timestamp || Date.now());
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      ...item,
      timeFormatted: timeStr
    };
  });

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0];
      return (
        <div className="chart-tooltip">
          <p className="tooltip-time">{label}</p>
          <p className="tooltip-value" style={{ color: activeTab.color }}>
            {activeTab.label}: <strong>{dataPoint.value} {activeTab.unit}</strong>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="sensor-chart-card">
      <div className="sensor-chart-header">
        <h3 className="sensor-chart-title">Real-Time Telemetry Trends</h3>
        <div className="sensor-chart-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`chart-tab-btn ${activeTabKey === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTabKey(tab.key)}
            >
              {tab.label}
              {isLive && !waitingForHardware && <span className="tab-live-dot" />}
            </button>
          ))}
        </div>
      </div>

      <div className="sensor-chart-body">
        {waitingForHardware ? (
          <div className="chart-empty-state">
            <span className="empty-chart-icon">📡</span>
            <p>Awaiting live sensor data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty-state">
            <p>Waiting for sensor data history...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="timeFormatted"
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#e2e8f0' }}
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey={activeTab.key}
                stroke={activeTab.color}
                strokeWidth={2.5}
                dot={{ r: 3, fill: activeTab.color }}
                activeDot={{ r: 6, stroke: '#ffffff', strokeWidth: 2 }}
                animationDuration={500}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
