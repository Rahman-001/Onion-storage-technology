export const THRESHOLDS = {
  temperature: {
    ideal: '20°C – 28°C',
    unit: '°C',
    label: 'Temperature',
    icon: '🌡️',
    getStatus: (val) => {
      if (val === undefined || val === null) return 'ok';
      if (val > 32) return 'danger';
      if (val > 28) return 'warning';
      return 'ok';
    }
  },
  humidity: {
    ideal: '65% – 75%',
    unit: '%',
    label: 'Humidity',
    icon: '💧',
    getStatus: (val) => {
      if (val === undefined || val === null) return 'ok';
      if (val > 85 || val < 55) return 'warning';
      return 'ok';
    }
  },
  co2: {
    ideal: '350 – 600 ppm',
    unit: 'ppm',
    label: 'CO₂ Level',
    icon: '💨',
    getStatus: (val) => {
      if (val === undefined || val === null) return 'ok';
      if (val > 1000) return 'danger';
      if (val > 600) return 'warning';
      return 'ok';
    }
  },
  weight: {
    ideal: '95kg – 100kg',
    unit: 'kg',
    label: 'Weight Retained',
    icon: '⚖️',
    getStatus: (val) => {
      if (val === undefined || val === null) return 'ok';
      if (val < 90) return 'danger';
      if (val < 95) return 'warning';
      return 'ok';
    }
  },
  light: {
    ideal: '0 – 100 lux',
    unit: 'lux',
    label: 'Light Level',
    icon: '💡',
    getStatus: (val) => {
      if (val === undefined || val === null) return 'ok';
      if (val > 300) return 'warning';
      return 'ok';
    }
  }
};

export function getStatusBadge(status) {
  switch (status) {
    case 'danger':
      return { label: 'Critical', icon: '🚨', className: 'status-danger' };
    case 'warning':
      return { label: 'Warning', icon: '⚠️', className: 'status-warning' };
    case 'ok':
    default:
      return { label: 'Normal', icon: '✅', className: 'status-ok' };
  }
}
