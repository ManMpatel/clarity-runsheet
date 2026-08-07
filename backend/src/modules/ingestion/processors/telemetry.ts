// Ported from worker/processors/telemetry.js. Same normalization logic; the destination is now
// a Postgres/TimescaleDB insert instead of a Mongo time-series collection insertOne. Retention
// (the old 1-year TTL) is now handled entirely by TimescaleDB's add_retention_policy (Phase 3
// migration) — no app-level TTL logic needed.
import { db } from '../../../db/client'
import { telemetry } from '../../../db/schema'

const METRES_TO_KM = 0.001
const MILLIVOLTS_TO_VOLTS = 0.001
const RPM_DIVISOR = 4

export interface NormalisedTelemetry {
  imei: string
  companyId: string
  vehicleId: string
  time: Date
  lat: number
  lng: number
  altitude: number | null
  angle: number | null
  satellites: number | null
  speed: number | null
  priority: number | null
  ignition: boolean | null
  movement: boolean | null
  odometer: number | null
  externalVoltage: number | null
  batteryVoltage: number | null
  engineRpm: number | null
  engineLoad: number | null
  coolantTemp: number | null
  fuelLevel: number | null
  gsmSignal: number | null
  dtcCount: number | null
  crashDetection: number | null
  greenDrivingType: number | null
  greenDrivingValue: number | null
  extras: Record<string, unknown>
}

function normaliseRecord(imei: string, companyId: string, vehicleId: string, record: any): NormalisedTelemetry {
  const io = record.io || {}

  return {
    imei,
    companyId,
    vehicleId,
    time: new Date(record.timestamp),
    lat: record.latitude,
    lng: record.longitude,
    altitude: record.altitude ?? null,
    angle: record.angle ?? null,
    satellites: record.satellites ?? null,
    speed: record.speed ?? null,
    priority: record.priority ?? null,
    ignition: io.ignition ?? (io.ignitionOnCounter > 0 ? true : null),
    movement: io.movementSensor ?? null,
    odometer: io.totalOdometer ? Math.round(io.totalOdometer * METRES_TO_KM) : null,
    externalVoltage: io.externalVoltage
      ? Number((io.externalVoltage * MILLIVOLTS_TO_VOLTS).toFixed(2))
      : io.batteryVoltage
      ? Number((io.batteryVoltage * MILLIVOLTS_TO_VOLTS).toFixed(2))
      : null,
    batteryVoltage: io.batteryVoltage ? Number((io.batteryVoltage * MILLIVOLTS_TO_VOLTS).toFixed(2)) : null,
    engineRpm: io.engineRpm ? Math.round(io.engineRpm / RPM_DIVISOR) : null,
    engineLoad: io.engineLoad ?? null,
    coolantTemp: io.coolantTemperature ?? null,
    fuelLevel: io.fuelTankLevelInput ?? null,
    gsmSignal: io.gsmSignal ?? null,
    dtcCount: io.numberOfDTCs ?? null,
    crashDetection: io.crashDetection ?? null,
    greenDrivingType: io.greenDrivingType ?? null,
    greenDrivingValue: io.greenDrivingValue ?? null,
    extras: io,
  }
}

export async function writeTelemetry(imei: string, companyId: string, vehicleId: string, records: any[]) {
  const docs = records.map((r) => normaliseRecord(imei, companyId, vehicleId, r))
  await db.insert(telemetry).values(docs as any)
  return docs
}

export { normaliseRecord }
