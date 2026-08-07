require('dotenv').config()
const { getClient } = require('./db/redis')
const { connect } = require('./db/mongo')
const { init: initSocket, broadcastVanUpdate, broadcastAlert } = require('./broadcaster/socketio')
const { writeTelemetry } = require('./processors/telemetry')
const { processDriverEvents } = require('./processors/driver-events')
const { processGeofences } = require('./processors/geofence')
const { processAlerts } = require('./processors/alerts')
const { processTripDetection } = require('./processors/trip-builder')
const { enrichAndSaveVanState } = require('./processors/enrichment')

const QUEUE_KEY = 'telemetry_queue'
const POLL_INTERVAL = 100

async function start() {
  await connect()
  initSocket()
  
  const { startSafetyScoreCron }    = require('./cron/safety-scores')
  const { startMaintenanceCron }    = require('./cron/maintenance-flags')
  const { startLicenceExpiryCron }  = require('./cron/licence-expiry')
  startSafetyScoreCron()
  startMaintenanceCron()
  startLicenceExpiryCron()
  const redis = getClient()
  console.log('[Worker] Started — polling queue')
  poll(redis)
}

async function poll(redis) {
  while (true) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 2)
      if (!result) continue

      const raw = result[1]
      const payload = JSON.parse(raw)
      await processPayload(payload)
    } catch (err) {
      console.error('[Worker] Poll error:', err.message)
      await sleep(POLL_INTERVAL)
    }
  }
}

async function processPayload(payload) {
  const { imei, receivedAt, ...record } = payload

  const vehicleDoc = await lookupVehicle(imei)
  if (!vehicleDoc) {
    console.warn(`[Worker] Unknown IMEI: ${imei}`)
    return
  }

  const { companyId, vehicleId } = vehicleDoc

  const normalisedDocs = await writeTelemetry(imei, companyId, vehicleId, [record])
  const doc = normalisedDocs[0]

  const geofenceEvents = await processGeofences(imei, companyId, vehicleId, doc)
  const driverEvents = await processDriverEvents(imei, companyId, vehicleId, doc)
  await processAlerts(imei, companyId, vehicleId, doc, geofenceEvents)
  await processTripDetection(imei, companyId, vehicleId, doc)

  const redis    = getClient()
  const enriched = await enrichAndSaveVanState(redis, imei, companyId, vehicleId, doc)

  broadcastVanUpdate(companyId, {
    imei,
    vehicleId,
    companyId,
    latitude:        enriched.latitude,
    longitude:       enriched.longitude,
    speed:           enriched.speed,
    angle:           enriched.angle,
    ignition:        enriched.ignition,
    externalVoltage: enriched.externalVoltage,
    batteryVoltage:  enriched.batteryVoltage,
    gsmSignal:       enriched.gsmSignal,
    odometer:        enriched.odometer,
    timestamp:       enriched.timestamp,
    address:         enriched.address,
    todayKm:         enriched.todayKm,
    status:          enriched.status,
    stateChangedAt:  enriched.stateChangedAt,
  })

  if (geofenceEvents.length > 0 || driverEvents.length > 0) {
    for (const event of [...geofenceEvents, ...driverEvents]) {
      broadcastAlert(companyId, event)
    }
  }

  }

async function lookupVehicle(imei) {
  const { getCollection } = require('./db/mongo')
  const collection = await getCollection('vehicles')
  const vehicle = await collection.findOne({ imei })
  if (!vehicle) return null
  return {
    companyId: vehicle.companyId.toString(),
    vehicleId: vehicle._id.toString(),
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

start().catch(err => {
  console.error('[Worker] Fatal error:', err.message)
  process.exit(1)
})