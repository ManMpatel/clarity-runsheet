const { getCollection } = require('../db/mongo')
const { setAlertCooldown, checkAlertCooldown } = require('../db/redis')
const { sendSms } = require('../services/twilio')

const AFTER_HOURS_START = 18
const AFTER_HOURS_END = 6
const COOLDOWN_SECONDS = 300

async function processAlerts(imei, companyId, vehicleId, record, geofenceEvents) {
  const collection = await getCollection('alert_rules')
  const rules = await collection.find({ companyId, active: true }).toArray()

  for (const rule of rules) {
    await evaluateRule(rule, imei, companyId, vehicleId, record, geofenceEvents)
  }
}

async function evaluateRule(rule, imei, companyId, vehicleId, record, geofenceEvents) {
  switch (rule.type) {
    case 'afterHours':
      return checkAfterHours(rule, imei, companyId, vehicleId, record)
    case 'speeding':
      return checkSpeeding(rule, imei, companyId, vehicleId, record)
    case 'engineFault':
      return checkEngineFault(rule, imei, companyId, vehicleId, record)
    case 'lowBattery':
      return checkLowBattery(rule, imei, companyId, vehicleId, record)
    case 'geofenceBreach':
      return checkGeofenceBreach(rule, companyId, vehicleId, geofenceEvents)
    case 'towing':
      return checkTowing(rule, imei, companyId, vehicleId, record)
    default:
      return null
  }
}

async function checkAfterHours(rule, imei, companyId, vehicleId, record) {
  if (!record.ignition) return null

  const hour = new Date(record.timestamp).getHours()
  const isAfterHours =
    hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END

  if (!isAfterHours) return null

  const cooldownKey = `afterHours:${imei}`
  const onCooldown = await checkAlertCooldown(cooldownKey)
  if (onCooldown) return null

  await setAlertCooldown(cooldownKey, COOLDOWN_SECONDS)
  return fireAlert({
    type:      'afterHours',
    imei,
    companyId,
    vehicleId,
    message:   `Van ignition on outside operating hours`,
    severity:  'warning',
    record,
    rule,
  })
}

async function checkSpeeding(rule, imei, companyId, vehicleId, record) {
  const limit = rule.speedLimit || 110
  if (record.speed <= limit) return null

  const cooldownKey = `speeding:${imei}`
  const onCooldown = await checkAlertCooldown(cooldownKey)
  if (onCooldown) return null

  await setAlertCooldown(cooldownKey, COOLDOWN_SECONDS)
  return fireAlert({
    type:      'speeding',
    imei,
    companyId,
    vehicleId,
    message:   `Van travelling at ${record.speed} km/h`,
    severity:  'warning',
    record,
    rule,
  })
}

async function checkEngineFault(rule, imei, companyId, vehicleId, record) {
  if (!record.dtcCount || record.dtcCount === 0) return null

  return fireAlert({
    type:      'engineFault',
    imei,
    companyId,
    vehicleId,
    message:   `Engine fault detected — ${record.dtcCount} DTC code(s)`,
    severity:  'critical',
    record,
    rule,
    noCooldown: true,
  })
}

async function checkLowBattery(rule, imei, companyId, vehicleId, record) {
  const threshold = rule.voltageThreshold || 11.5
  if (!record.externalVoltage) return null
  if (parseFloat(record.externalVoltage) >= threshold) return null

  const cooldownKey = `lowBattery:${imei}`
  const onCooldown = await checkAlertCooldown(cooldownKey)
  if (onCooldown) return null

  await setAlertCooldown(cooldownKey, COOLDOWN_SECONDS)
  return fireAlert({
    type:      'lowBattery',
    imei,
    companyId,
    vehicleId,
    message:   `Low battery voltage: ${record.externalVoltage}V`,
    severity:  'warning',
    record,
    rule,
  })
}

async function checkGeofenceBreach(rule, companyId, vehicleId, geofenceEvents) {
  if (!geofenceEvents || geofenceEvents.length === 0) return null

  for (const event of geofenceEvents) {
    if (event.type === 'exit' && rule.zoneId?.toString() === event.zoneId?.toString()) {
      return fireAlert({
        type:      'geofenceBreach',
        companyId,
        vehicleId,
        message:   `Van exited zone: ${event.zoneName}`,
        severity:  'warning',
        record:    { timestamp: event.timestamp, longitude: event.location.coordinates[0], latitude: event.location.coordinates[1] },
        rule,
      })
    }
  }
  return null
}

async function checkTowing(rule, imei, companyId, vehicleId, record) {
  if (record.ignition) return null
  if (record.speed < 5) return null

  return fireAlert({
    type:      'towing',
    imei,
    companyId,
    vehicleId,
    message:   `Possible towing detected — moving with ignition off`,
    severity:  'critical',
    record,
    rule,
    noCooldown: true,
  })
}

async function fireAlert({ type, imei, companyId, vehicleId, message, severity, record, rule, noCooldown }) {
  const collection = await getCollection('alerts')

  const alert = {
    type,
    imei,
    companyId,
    vehicleId,
    message,
    severity,
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    read:      false,
    createdAt: new Date(),
  }

  await collection.insertOne(alert)

  if (severity === 'critical' && rule.smsNumber) {
    await sendSms(rule.smsNumber, `CLARITY FLEET ALERT: ${message}`)
  }

  return alert
}

module.exports = { processAlerts }