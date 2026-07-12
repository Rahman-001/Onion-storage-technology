import React, { useState } from 'react';
import './ModeToggle.css';

export function ModeToggle({ mode, hardwareConnected, onToggle }) {
  const [transitionMsg, setTransitionMsg] = useState(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const handleToggle = async () => {
    if (isSwitching) return;

    const targetMode = mode === 'demo' ? 'live' : 'demo';
    setIsSwitching(true);
    setTransitionMsg(`Switching to ${targetMode.toUpperCase()} mode...`);

    try {
      await onToggle(targetMode);
    } catch (err) {
      console.error('Failed to toggle mode:', err);
    } finally {
      setTimeout(() => {
        setTransitionMsg(null);
        setIsSwitching(false);
      }, 2000);
    }
  };

  const isLive = mode === 'live';

  return (
    <div className="mode-toggle-container">
      <div className="mode-toggle-main">
        <div className="mode-toggle-wrapper">
          <span className={`mode-label ${!isLive ? 'active-demo' : ''}`}>DEMO</span>

          <button
            type="button"
            className={`switch-pill ${isLive ? 'pill-live' : 'pill-demo'}`}
            onClick={handleToggle}
            disabled={isSwitching}
            title="Click to switch between Demo and Live Mode"
          >
            <div className="switch-thumb" />
          </button>

          <span className={`mode-label ${isLive ? 'active-live' : ''}`}>LIVE</span>
        </div>

        <div className="mode-badge-wrapper">
          {!isLive ? (
            <span className="badge badge-demo">
              Simulated Data
            </span>
          ) : hardwareConnected ? (
            <span className="badge badge-live-connected">
              <span className="pulsing-dot" /> Hardware Connected
            </span>
          ) : (
            <span className="badge badge-live-waiting">
              ⚠️ Waiting for Hardware
            </span>
          )}
        </div>
      </div>

      {isLive && (
        <span className="mode-subtext">
          {hardwareConnected ? 'Live signal active' : 'No signal from device'}
        </span>
      )}

      {transitionMsg && (
        <div className="mode-transition-toast">
          {transitionMsg}
        </div>
      )}
    </div>
  );
}
