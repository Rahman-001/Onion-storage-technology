import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export function useSensorData() {
  const [current, setCurrent] = useState(null);
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [mode, setMode] = useState('demo');
  const [hardwareConnected, setHardwareConnected] = useState(false);
  const [lastLiveData, setLastLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const consecutiveFailures = useRef(0);

  const handleFetchError = (err) => {
    consecutiveFailures.current += 1;
    if (consecutiveFailures.current >= 3) {
      setError(`Connection lost: Unable to sync with backend server (${err.message})`);
    }
  };

  const resetError = () => {
    consecutiveFailures.current = 0;
    setError(null);
  };

  // Poll Mode (Every 5 seconds)
  const fetchMode = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/mode`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data) {
        setMode(data.mode || 'demo');
        setHardwareConnected(!!data.hardwareConnected);
        setLastLiveData(data.lastLiveData || null);
      }
    } catch (err) {
      console.error('Error fetching mode:', err);
    }
  }, []);

  // Poll Latest Reading (3s)
  const fetchLatest = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sensors/latest`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCurrent(data);
      setLastUpdated(new Date());
      resetError();
    } catch (err) {
      handleFetchError(err);
    }
  }, []);

  // Poll History (30s)
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/sensors/history?limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  }, []);

  // Poll Alerts (5s)
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts?limit=30`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAlerts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  }, []);

  // Toggle Mode API Action
  const toggleMode = async (targetMode) => {
    try {
      const newMode = targetMode || (mode === 'demo' ? 'live' : 'demo');
      const res = await fetch(`${API_BASE_URL}/api/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data) {
        setMode(data.mode);
        setHardwareConnected(!!data.hardwareConnected);
        await Promise.all([fetchMode(), fetchLatest(), fetchHistory()]);
      }
    } catch (err) {
      console.error('Error toggling mode:', err);
      throw err;
    }
  };

  // Acknowledge Alert API Action
  const acknowledgeAlert = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/${id}/acknowledge`, {
        method: 'PATCH'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts((prev) =>
        prev.map((item) => (item._id === id ? { ...item, acknowledged: true } : item))
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  // Clear All Alerts API Action
  const clearAlerts = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/alerts/clear`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setAlerts([]);
    } catch (err) {
      console.error('Error clearing alerts:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchMode(), fetchLatest(), fetchHistory(), fetchAlerts()]);
      if (isMounted) setLoading(false);
    };

    init();

    const modeInterval = setInterval(fetchMode, 5000); // 5 seconds mode polling
    const latestInterval = setInterval(fetchLatest, 3000);
    const historyInterval = setInterval(fetchHistory, 30000);
    const alertsInterval = setInterval(fetchAlerts, 5000);

    return () => {
      isMounted = false;
      clearInterval(modeInterval);
      clearInterval(latestInterval);
      clearInterval(historyInterval);
      clearInterval(alertsInterval);
    };
  }, [fetchMode, fetchLatest, fetchHistory, fetchAlerts]);

  const waitingForHardware = mode === 'live' && !hardwareConnected;

  return {
    current,
    history,
    alerts,
    mode,
    hardwareConnected,
    lastLiveData,
    waitingForHardware,
    loading,
    error,
    lastUpdated,
    toggleMode,
    acknowledgeAlert,
    clearAlerts
  };
}
