export const ALERT_TYPES = {
  AFTER_HOURS: 'afterHours',
  SPEEDING: 'speeding',
  ENGINE_FAULT: 'engineFault',
  LOW_BATTERY: 'lowBattery',
  GEOFENCE_BREACH: 'geofenceBreach',
  TOWING: 'towing',
  CRASH: 'crash',
  HARSH_BRAKING: 'harshBraking',
  HARSH_ACCEL: 'harshAcceleration',
  HARSH_CORNERING: 'harshCornering',
  // Not in the original shared/alert-types.js map, but a real alert type produced by
  // worker/cron/maintenance-flags.js — added here since the Postgres `alert_type` enum
  // needs every value that actually gets inserted.
  MAINTENANCE_DUE: 'maintenanceDue',
} as const

export type AlertType = (typeof ALERT_TYPES)[keyof typeof ALERT_TYPES]

export const SEVERITY = {
  CRITICAL: 'critical',
  WARNING: 'warning',
  INFO: 'info',
} as const

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY]

export const NO_COOLDOWN_TYPES: AlertType[] = [
  ALERT_TYPES.CRASH,
  ALERT_TYPES.ENGINE_FAULT,
  ALERT_TYPES.TOWING,
]

export const ALERT_COOLDOWN_SECONDS = 300
