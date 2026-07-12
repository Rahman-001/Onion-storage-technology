import React from 'react';
import './SpoilageScore.css';

export function SpoilageScore({ score, lastUpdated, waitingForHardware = false }) {
  const isNoData = waitingForHardware || score === undefined || score === null;
  const normalizedScore = isNoData ? 0 : Math.min(100, Math.max(0, score || 0));

  const getScoreDetails = (val) => {
    if (isNoData) {
      return { label: 'No Data', icon: '⚪', color: '#94a3b8', bg: '#f8fafc' };
    }
    if (val > 80) {
      return { label: 'Spoiling', icon: '🔴', color: '#dc2626', bg: '#fef2f2' };
    }
    if (val > 60) {
      return { label: 'High Risk', icon: '🟠', color: '#ea580c', bg: '#fff7ed' };
    }
    if (val > 30) {
      return { label: 'Monitor', icon: '🟡', color: '#d97706', bg: '#fffbeb' };
    }
    return { label: 'Fresh', icon: '🟢', color: '#16a34a', bg: '#f0fdf4' };
  };

  const status = getScoreDetails(normalizedScore);

  const radius = 64;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = isNoData ? circumference : circumference - (normalizedScore / 100) * circumference;

  const timeFormatted = isNoData
    ? 'Awaiting signal'
    : lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Just now';

  return (
    <div className="spoilage-score-card">
      <div className="spoilage-score-header">
        <h3 className="spoilage-score-title">Spoilage Risk Index</h3>
        <span className="spoilage-score-icon">🧅</span>
      </div>

      <div className="spoilage-ring-container">
        <svg className="spoilage-ring-svg" width="160" height="160" viewBox="0 0 160 160">
          <circle
            className="spoilage-ring-bg"
            cx="80"
            cy="80"
            r={radius}
            strokeWidth={strokeWidth}
          />
          <circle
            className="spoilage-ring-fg"
            cx="80"
            cy="80"
            r={radius}
            strokeWidth={strokeWidth}
            stroke={status.color}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        <div className="spoilage-ring-content">
          <span className="spoilage-number">{isNoData ? '--%' : `${normalizedScore}%`}</span>
          <span className="spoilage-subtext">Risk Score</span>
        </div>
      </div>

      <div className="spoilage-status-box" style={{ backgroundColor: status.bg, borderColor: status.color + '40' }}>
        <span className="spoilage-status-text" style={{ color: status.color }}>
          {status.icon} {status.label}
        </span>
      </div>

      <div className="spoilage-footer">
        <span>{timeFormatted}</span>
      </div>
    </div>
  );
}
