// Ported from worker/processors/driver-events.js. Cooldown keys move to the in-memory
// state.ts map (were Redis alert:cooldown:{key} keys with the same TTLs).
import { db } from '../../../db/client'
import { driverEvents } from '../../../db/schema'
import { checkCooldown, setCooldown } from '../state'
import type { NormalisedTelemetry } from './telemetry'

const GREEN_DRIVING_TYPES: Record<number, 'harshBraking' | 'harshAcceleration' | 'harshCornering'> = {
  1: 'harshBraking',
  2: 'harshAcceleration',
  3: 'harshCornering',
}

export async function processDriverEvents(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const events: (typeof driverEvents.$inferSelect)[] = []

  if (record.crashDetection && record.crashDetection > 0) {
    events.push(await saveCrashEvent(imei, companyId, vehicleId, record))
  }

  if (record.greenDrivingType && record.greenDrivingValue) {
    const event = await saveGreenDrivingEvent(imei, companyId, vehicleId, record)
    if (event) events.push(event)
  }

  if ((record.speed ?? 0) > 110) {
    const event = await saveSpeedingEvent(imei, companyId, vehicleId, record)
    if (event) events.push(event)
  }

  return events
}

async function saveCrashEvent(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const [event] = await db.insert(driverEvents).values({
    type: 'crash',
    imei,
    companyId,
    vehicleId,
    timestamp: record.time,
    lat: record.lat,
    lng: record.lng,
    speed: record.speed,
    severity: String(record.crashDetection),
  }).returning()
  return event
}

async function saveGreenDrivingEvent(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const type = GREEN_DRIVING_TYPES[record.greenDrivingType!]
  if (!type) return null

  const cooldownKey = `${imei}:${type}`
  if (checkCooldown(cooldownKey)) return null

  const [event] = await db.insert(driverEvents).values({
    type,
    imei,
    companyId,
    vehicleId,
    timestamp: record.time,
    lat: record.lat,
    lng: record.lng,
    speed: record.speed,
    value: String(record.greenDrivingValue),
  }).returning()

  setCooldown(cooldownKey, 30)
  return event
}

async function saveSpeedingEvent(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const cooldownKey = `${imei}:speeding`
  if (checkCooldown(cooldownKey)) return null

  const [event] = await db.insert(driverEvents).values({
    type: 'speeding',
    imei,
    companyId,
    vehicleId,
    timestamp: record.time,
    lat: record.lat,
    lng: record.lng,
    speed: record.speed,
  }).returning()

  setCooldown(cooldownKey, 300)
  return event
}
