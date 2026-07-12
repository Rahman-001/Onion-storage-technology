import React from 'react';
import { getStatusBadge } from '../utils/thresholds';
import './MetricCard.css';

export function MetricCard({
  label,
  icon,
  value,
  unit,
  statusKey = 'ok',
  idealText,
  source = 'demo',
  isLive = false,
  waitingForHardware = false
}) {
  const badge = getStatusBadge(statusKey);

  const topBarColors = {
    ok: '#16a34a',
    warning: '#d97706',
    danger: '#dc2626'
  };

  const topColor = topBarColors[statusKey] || topBarColors.ok;

  const cardClasses = [
    'metric-card',
    waitingForHardware ? 'card-waiting' : '',
    isLive && !waitingForHardware ? 'card-live-active' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {!waitingForHardware && (
        <div className="metric-card-top-bar" style={{ backgroundColor: topColor }} />
      )}

      <div className="metric-card-header">
        <div className="metric-card-title-group">
          <span className="metric-card-icon">{icon}</span>
          <span className="metric-card-label">{label}</span>
        </div>
        <span className={`metric-source-tag ${isLive ? 'tag-live' : 'tag-demo'}`}>
          {isLive ? 'LIVE' : 'DEMO'}
        </span>
      </div>

      <div className="metric-card-body">
        <div className="metric-card-value-group">
          <span className="metric-card-value">
            {waitingForHardware ? '--' : (value !== undefined && value !== null ? value : '--')}
          </span>
          <span className="metric-card-unit">{unit}</span>
        </div>

        <div className="metric-card-footer">
          <span className="metric-card-ideal">Ideal: {idealText}</span>
          {waitingForHardware ? (
            <span className="metric-status-pill status-no-signal">
              ⚪ No Signal
            </span>
          ) : (
            <span className={`metric-status-pill ${badge.className}`}>
              {badge.icon} {badge.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
