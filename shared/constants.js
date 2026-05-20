const COLLECTIONS = {
  TELEMETRY:        'telemetry_events',
  VEHICLES:         'vehicles',
  DRIVERS:          'drivers',
  TRIPS:            'trips',
  ALERTS:           'alerts',
  ALERT_RULES:      'alert_rules',
  GEOFENCES:        'geofences',
  GEOFENCE_EVENTS:  'geofence_events',
  MAINTENANCE:      'maintenance',
  COMPANIES:        'companies',
  USERS:            'users',
  SAFETY_SCORES:    'safety_scores',
  DRIVER_EVENTS:    'driver_events',
}

const PORTS = {
  TCP:    5027,
  API:    3000,
  SOCKET: 3001,
}

const REDIS_KEYS = {
  VAN_STATE:        (imei)          => `van:state:${imei}`,
  ALERT_COOLDOWN:   (key)           => `alert:cooldown:${key}`,
  GEO_STATE:        (imei, zoneId)  => `geo:state:${imei}:${zoneId}`,
  TELEMETRY_QUEUE:  'telemetry_queue',
}

const ALERT_COOLDOWN_SECONDS = {
  afterHours:     300,
  speeding:       300,
  lowBattery:     300,
  geofenceBreach: 60,
}

module.exports = { COLLECTIONS, PORTS, REDIS_KEYS, ALERT_COOLDOWN_SECONDS }