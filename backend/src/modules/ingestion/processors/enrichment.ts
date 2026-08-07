// Ported from worker/processors/enrichment.js. The old version read/wrote a Redis
// `van:state:{imei}` JSON blob; this version reads the previous vehicle_state row from
// Postgres and upserts the new one in place — same derived-field logic (status, since-timer,
// today's km, cooldown-throttled reverse geocode), different storage. The reverse-geocode
// cooldown moves to the in-memory state.ts map (was a Redis key with the same 60s TTL shape).
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { vehicleState } from '../../../db/schema'
import { checkCooldown, setCooldown } from '../state'
import type { NormalisedTelemetry } from './telemetry'

const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getStatus(doc: NormalisedTelemetry): 'moving' | 'idle' | 'stopped' {
  if ((doc.speed ?? 0) > 0) return 'moving'
  if (doc.ignition) return 'idle'
  return 'stopped'
}

async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,street&limit=1`
    const res = await fetch(url)
    const data: any = await res.json()
    return data.features?.[0]?.place_name || null
  } catch (err: any) {
    console.error('[Enrichment] Geocode error:', err.message)
    return null
  }
}

export async function enrichAndSaveVanState(imei: string, companyId: string, vehicleId: string, doc: NormalisedTelemetry) {
  const [prev] = await db.select().from(vehicleState).where(eq(vehicleState.vehicleId, vehicleId)).limit(1)

  const lat = doc.lat
  const lng = doc.lng
  const currentStatus = getStatus(doc)
  const prevStatus = prev?.status ?? undefined

  const stateChangedAt = currentStatus !== prevStatus
    ? new Date()
    : (prev?.stateChangedAt ?? new Date())

  const todayDate = getTodayDate()
  let todayKm = prev?.todayKm ? Number(prev.todayKm) : 0
  let todayOdometerBase = prev?.todayOdometerBase ?? null

  if (!todayOdometerBase || prev?.todayDate !== todayDate) {
    todayOdometerBase = doc.odometer ?? 0
    todayKm = 0
  } else if (doc.odometer != null && doc.odometer > todayOdometerBase) {
    todayKm = Number((doc.odometer - todayOdometerBase).toFixed(1))
  }

  // Reverse geocode — only on status change or no address, max once per minute per vehicle.
  let address = prev?.address ?? null
  const cooldownKey = `geocode:cooldown:${imei}`
  const onCooldown = checkCooldown(cooldownKey)

  if (!onCooldown && (!address || currentStatus !== prevStatus)) {
    const newAddress = await reverseGeocode(lat, lng)
    if (newAddress) {
      address = newAddress
      setCooldown(cooldownKey, 60)
    }
  }

  const enriched = {
    vehicleId,
    updatedAt: new Date(),
    lat,
    lng,
    speed: doc.speed,
    ignition: doc.ignition,
    odometer: doc.odometer,
    status: currentStatus,
    stateChangedAt,
    address,
    todayKm: String(todayKm),
    todayOdometerBase,
    todayDate,
  }

  await db.insert(vehicleState).values(enriched).onConflictDoUpdate({
    target: vehicleState.vehicleId,
    set: enriched,
  })

  // Shape returned to the caller mirrors the old Redis-cached blob's fields (imei/companyId
  // included) since worker/index.js's broadcastVanUpdate payload used them directly.
  return { imei, companyId, ...enriched, angle: doc.angle, externalVoltage: doc.externalVoltage, batteryVoltage: doc.batteryVoltage, gsmSignal: doc.gsmSignal, timestamp: doc.time }
}
