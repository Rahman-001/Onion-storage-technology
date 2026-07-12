import React, { useState } from 'react';
import './AlertLog.css';

function timeAgo(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return `${Math.max(1, seconds)}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export function AlertLog({ alerts = [], onClear, onAcknowledge }) {
  const [filter, setFilter] = useState('all');

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'danger') return alert.type === 'danger';
    if (filter === 'warning') return alert.type === 'warning';
    if (filter === 'acknowledged') return alert.acknowledged;
    return true; // 'all'
  });

  return (
    <div className="alert-log-card">
      <div className="alert-log-header">
        <div className="alert-log-title-group">
          <h3 className="alert-log-title">System Alert Diagnostics</h3>
          {unacknowledgedCount > 0 ? (
            <span className="alert-count-badge badge-active">
              {unacknowledgedCount} Active Alert{unacknowledgedCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="alert-count-badge badge-normal">
              ✅ All Normal
            </span>
          )}
        </div>

        <div className="alert-log-controls">
          <div className="alert-filter-tabs">
            {['all', 'danger', 'warning', 'acknowledged'].map((tabKey) => (
              <button
                key={tabKey}
                type="button"
                className={`filter-tab-btn ${filter === tabKey ? 'active' : ''}`}
                onClick={() => setFilter(tabKey)}
              >
                {tabKey.charAt(0).toUpperCase() + tabKey.slice(1)}
              </button>
            ))}
          </div>

          {alerts.length > 0 && (
            <button
              type="button"
              className="clear-all-btn"
              onClick={onClear}
              title="Clear all alerts from history"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="alert-log-body">
        {filteredAlerts.length === 0 ? (
          <div className="alert-empty-state">
            <span className="empty-check-icon">✅</span>
            <h4>All storage conditions are normal</h4>
            <p>No environmental alerts reported for current filters.</p>
          </div>
        ) : (
          <div className="alert-list">
            {filteredAlerts.map((alert) => {
              const isDanger = alert.type === 'danger';
              return (
                <div
                  key={alert._id || alert.timestamp}
                  className={`alert-row ${isDanger ? 'alert-row-danger' : 'alert-row-warning'} ${
                    alert.acknowledged ? 'acknowledged' : ''
                  }`}
                >
                  <div className="alert-message-content">
                    <span className="alert-msg-text">{alert.message}</span>
                    <span className="alert-timestamp">{timeAgo(alert.timestamp)}</span>
                  </div>

                  <div className="alert-actions">
                    <button
                      type="button"
                      className={`ack-btn ${alert.acknowledged ? 'ack-disabled' : ''}`}
                      disabled={alert.acknowledged}
                      onClick={() => onAcknowledge(alert._id)}
                    >
                      {alert.acknowledged ? '✓ Acknowledged' : '✓ Acknowledge'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
