const ALERT_TYPES = {
  AFTER_HOURS:      'afterHours',
  SPEEDING:         'speeding',
  ENGINE_FAULT:     'engineFault',
  LOW_BATTERY:      'lowBattery',
  GEOFENCE_BREACH:  'geofenceBreach',
  TOWING:           'towing',
  CRASH:            'crash',
  HARSH_BRAKING:    'harshBraking',
  HARSH_ACCEL:      'harshAcceleration',
  HARSH_CORNERING:  'harshCornering',
}

const SEVERITY = {
  CRITICAL: 'critical',
  WARNING:  'warning',
  INFO:     'info',
}

const NO_COOLDOWN_TYPES = [
  ALERT_TYPES.CRASH,
  ALERT_TYPES.ENGINE_FAULT,
  ALERT_TYPES.TOWING,
]

module.exports = { ALERT_TYPES, SEVERITY, NO_COOLDOWN_TYPES }