const { getCollection } = require('../db/mongo')
const { setAlertCooldown, checkAlertCooldown } = require('../db/redis')

const GREEN_DRIVING_TYPES = {
  1: 'harshBraking',
  2: 'harshAcceleration',
  3: 'harshCornering',
}

async function processDriverEvents(imei, companyId, vehicleId, record) {
  const events = []

  if (record.crashDetection && record.crashDetection > 0) {
    const event = await saveCrashEvent(imei, companyId, vehicleId, record)
    events.push(event)
  }

  if (record.greenDrivingType && record.greenDrivingValue) {
    const event = await saveGreenDrivingEvent(
      imei, companyId, vehicleId, record
    )
    if (event) events.push(event)
  }

  if (record.speed > 110) {
    const event = await saveSpeedingEvent(imei, companyId, vehicleId, record)
    if (event) events.push(event)
  }

  return events
}

async function saveCrashEvent(imei, companyId, vehicleId, record) {
  const collection = await getCollection('driver_events')

  const event = {
    type:      'crash',
    imei,
    companyId,
    vehicleId,
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    speed:    record.speed,
    severity: record.crashDetection,
    createdAt: new Date(),
  }

  await collection.insertOne(event)
  return event
}

async function saveGreenDrivingEvent(imei, companyId, vehicleId, record) {
  const type = GREEN_DRIVING_TYPES[record.greenDrivingType]
  if (!type) return null

  const cooldownKey = `${imei}:${type}`
  const onCooldown = await checkAlertCooldown(cooldownKey)
  if (onCooldown) return null

  const collection = await getCollection('driver_events')

  const event = {
    type,
    imei,
    companyId,
    vehicleId,
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    speed:    record.speed,
    value:    record.greenDrivingValue,
    createdAt: new Date(),
  }

  await collection.insertOne(event)
  await setAlertCooldown(cooldownKey, 30)
  return event
}

async function saveSpeedingEvent(imei, companyId, vehicleId, record) {
  const cooldownKey = `${imei}:speeding`
  const onCooldown = await checkAlertCooldown(cooldownKey)
  if (onCooldown) return null

  const collection = await getCollection('driver_events')

  const event = {
    type:      'speeding',
    imei,
    companyId,
    vehicleId,
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    speed:    record.speed,
    createdAt: new Date(),
  }

  await collection.insertOne(event)
  await setAlertCooldown(cooldownKey, 300)
  return event
}

module.exports = { processDriverEvents }