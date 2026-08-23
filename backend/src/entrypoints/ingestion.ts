// Ported from worker/index.js. The BRPOP polling loop's SHAPE is unchanged (same queue key, same
// tight while(true) + brpop(2) pattern) — that's the untouched half of the tcp-listener handoff
// per the hard constraint. What changed is everything downstream of the dequeue: Mongo lookups
// and writes replaced with Drizzle/Postgres, the Redis van:state cache replaced by enrichment's
// vehicle_state upsert, and alert triggers now firing both a socket emit and a push dispatch.
// See api.ts's matching comment: `import 'dotenv/config'` (not `require('dotenv').config()`)
// because import statements hoist above other code once compiled — must be the first import so
// env vars are loaded before any module below reads process.env at load time (e.g. db/client.ts's
// pg Pool constructor).
import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { vehicles } from '../db/schema'
import { getClient } from '../modules/ingestion/queue/redis'
import { init as initSocket, broadcastVanUpdate, recordProcessed, recordUnknownImei } from '../socket'
import { writeTelemetry } from '../modules/ingestion/processors/telemetry'
import { processDriverEvents } from '../modules/ingestion/processors/driver-events'
import { processGeofences } from '../modules/ingestion/processors/geofence'
import { processAlerts } from '../modules/ingestion/processors/alerts'
import { processTripDetection } from '../modules/ingestion/processors/trip-builder'
import { enrichAndSaveVanState } from '../modules/ingestion/processors/enrichment'
import { startSafetyScoreCron } from '../modules/ingestion/cron/safety-scores'
import { startMaintenanceCron } from '../modules/ingestion/cron/maintenance-flags'
import { startLicenceExpiryCron } from '../modules/ingestion/cron/licence-expiry'
import { startPushReceiptCron } from '../modules/ingestion/cron/push-receipts'

const QUEUE_KEY = 'telemetry_queue'
const POLL_INTERVAL = 100

async function start() {
  initSocket()
  startSafetyScoreCron()
  startMaintenanceCron()
  startLicenceExpiryCron()
  startPushReceiptCron()

  const redis = getClient()
  console.log('[Ingestion] Started — polling queue')
  poll(redis)
}

async function poll(redis: any) {
  while (true) {
    try {
      const result = await redis.brpop(QUEUE_KEY, 2)
      if (!result) continue

      const raw = result[1]
      const payload = JSON.parse(raw)
      await processPayload(payload)
    } catch (err: any) {
      console.error('[Ingestion] Poll error:', err.message)
      await sleep(POLL_INTERVAL)
    }
  }
}

async function processPayload(payload: any) {
  const { imei, receivedAt, ...record } = payload

  const vehicle = await lookupVehicle(imei)
  if (!vehicle) {
    // The device already got its ACK from tcp-listener before this point, so this record is gone
    // for good — there is no retry or dead-letter. Counted so /health on this process exposes it;
    // the warn line alone is invisible unless someone is tailing the right container's logs.
    // If you see this for a device you expect to be tracking, the fix is a vehicles row with this
    // exact IMEI (POST /api/v1/vehicles, or Settings -> Vehicles in the dashboard).
    recordUnknownImei(imei)
    console.warn(`[Ingestion] Unknown IMEI: ${imei} — no vehicles row, telemetry discarded`)
    return
  }

  recordProcessed()
  const { companyId, vehicleId } = vehicle

  const [doc] = await writeTelemetry(imei, companyId, vehicleId, [record])

  const geofenceEvents = await processGeofences(imei, companyId, vehicleId, doc)
  const driverEventsFired = await processDriverEvents(imei, companyId, vehicleId, doc)
  await processAlerts(imei, companyId, vehicleId, doc, geofenceEvents)
  await processTripDetection(imei, companyId, vehicleId, doc)

  const enriched = await enrichAndSaveVanState(imei, companyId, vehicleId, doc)

  broadcastVanUpdate(companyId, enriched)

  // geofence enter/exit and driver-safety events (crash/harsh braking/speeding) also get a
  // live socket push, independent of whether an alert_rule matched them.
  if (geofenceEvents.length > 0 || driverEventsFired.length > 0) {
    const { broadcastAlert } = require('../socket')
    for (const event of [...geofenceEvents, ...driverEventsFired]) {
      broadcastAlert(companyId, event)
    }
  }
}

async function lookupVehicle(imei: string) {
  const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.imei, imei)).limit(1)
  if (!vehicle) return null
  return { companyId: vehicle.companyId, vehicleId: vehicle.id }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

start().catch((err) => {
  console.error('[Ingestion] Fatal error:', err.message)
  process.exit(1)
})
