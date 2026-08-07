// Ported from worker/processors/trip-builder.js. The old version kept the "is a trip currently
// active" fact AND its working bookkeeping (distance so far, last movement time, max speed) in a
// single Redis JSON blob per imei. Now split in two, per the Phase 5 design:
//   - the FACT of an open trip is a `trips` row with end_time IS NULL (durable, self-healing —
//     survives an ingestion restart, unlike the old Redis cache which would've lost it too)
//   - the per-packet WORKING bookkeeping (accumulated distance, last point, max speed) stays
//     in-memory (state.ts) since round-tripping that through Postgres on every single telemetry
//     point isn't worth it; if ingestion restarts mid-trip, tracking resumes from the next
//     packet's position (loses a few metres of that one trip's distance, not the trip itself).
import { eq, and, isNull } from 'drizzle-orm'
import { db } from '../../../db/client'
import { trips } from '../../../db/schema'
import { getActiveTripState, setActiveTripState, clearActiveTripState } from '../state'
import { autoClassifyTrip } from '../fbt-classifier'
import type { NormalisedTelemetry } from './telemetry'

const TRIP_END_SECONDS = 300
const MIN_TRIP_DISTANCE_METRES = 200

export async function processTripDetection(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const ignition = record.ignition
  const speed = record.speed || 0

  let active = getActiveTripState(imei)

  // Self-heal after a restart: in-memory state is gone but Postgres still has the open trip row.
  if (!active) {
    const [openTrip] = await db.select().from(trips)
      .where(and(eq(trips.vehicleId, vehicleId), isNull(trips.endTime)))
      .limit(1)
    if (openTrip) {
      active = {
        tripId: openTrip.id,
        lastMovement: Date.now(),
        distanceMetres: 0,
        maxSpeed: Number(openTrip.maxSpeed ?? 0),
        prevLat: record.lat,
        prevLng: record.lng,
      }
      setActiveTripState(imei, active)
    }
  }

  if (!active) {
    if (ignition && speed > 0) {
      await startTrip(imei, companyId, vehicleId, record)
    }
    return
  }

  if (ignition || speed > 0) {
    updateActiveTrip(imei, active, record)
  } else {
    const secondsSinceMove = ignition === false
      ? TRIP_END_SECONDS // ignition off is an immediate end signal, same as the original
      : (record.time.getTime() - active.lastMovement) / 1000

    if (ignition === false || secondsSinceMove >= TRIP_END_SECONDS) {
      await endTrip(imei, active, record, vehicleId, companyId)
    }
  }
}

async function startTrip(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const [trip] = await db.insert(trips).values({
    imei,
    companyId,
    vehicleId,
    startTime: record.time,
    startLat: record.lat,
    startLng: record.lng,
    maxSpeed: record.speed ?? 0,
  }).returning({ id: trips.id })

  setActiveTripState(imei, {
    tripId: trip.id,
    lastMovement: record.time.getTime(),
    distanceMetres: 0,
    maxSpeed: record.speed || 0,
    prevLat: record.lat,
    prevLng: record.lng,
  })

  console.log(`[Trip] Started for IMEI ${imei}`)
}

function updateActiveTrip(imei: string, active: NonNullable<ReturnType<typeof getActiveTripState>>, record: NormalisedTelemetry) {
  const dist = haversine(active.prevLat, active.prevLng, record.lat, record.lng)

  setActiveTripState(imei, {
    ...active,
    lastMovement: record.time.getTime(),
    maxSpeed: Math.max(active.maxSpeed, record.speed || 0),
    distanceMetres: active.distanceMetres + dist,
    prevLat: record.lat,
    prevLng: record.lng,
  })
}

async function endTrip(imei: string, active: NonNullable<ReturnType<typeof getActiveTripState>>, record: NormalisedTelemetry, vehicleId: string, companyId: string) {
  clearActiveTripState(imei)

  if (active.distanceMetres < MIN_TRIP_DISTANCE_METRES) {
    // Too short — discard. Delete the row we speculatively created at trip start rather than
    // leaving a permanently-open, never-ending trip behind.
    await db.delete(trips).where(eq(trips.id, active.tripId))
    console.log(`[Trip] Too short — discarded for IMEI ${imei}`)
    return
  }

  const [openTrip] = await db.select().from(trips).where(eq(trips.id, active.tripId)).limit(1)
  const startTime = openTrip.startTime
  const endTime = record.time
  const durationMinutes = Math.round((endTime.getTime() - new Date(startTime).getTime()) / 60000)
  const distanceKm = Number((active.distanceMetres / 1000).toFixed(2))

  await db.update(trips).set({
    endTime,
    endLat: record.lat,
    endLng: record.lng,
    distanceKm: String(distanceKm),
    durationMinutes,
    maxSpeed: active.maxSpeed,
    updatedAt: new Date(),
  }).where(eq(trips.id, active.tripId))

  // Wrapped in try/catch — the original had none, which is exactly why the autoClassifyTrip
  // import-path bug (fixed by consolidating to one canonical module, see fbt-classifier.ts)
  // was crashing trip-ending in production. A classifier failure should never prevent a
  // completed trip from being saved.
  try {
    await autoClassifyTrip(active.tripId, companyId, new Date(startTime))
  } catch (err: any) {
    console.error('[Trip] Classification failed:', err.message)
  }

  console.log(`[Trip] Saved — ${distanceKm}km, ${durationMinutes}min for IMEI ${imei}`)
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
