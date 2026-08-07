// Ported from worker/processors/alerts.js. Cooldowns move to the in-memory state.ts map. The
// biggest behavioral addition (per Phase 4/5 spec): every fired alert now calls BOTH the
// Socket.io broadcast (reaches anyone with the app open) AND the push dispatch (reaches anyone
// who doesn't) — these are two different jobs and the old code only did the push half via a
// direct users-collection query, with no socket emit for alerts at all (broadcastAlert existed
// in broadcaster/socketio.js but was only ever called from worker/index.js for geofence/driver
// events, not from processAlerts). Both now fire from one place.
import { eq, and } from 'drizzle-orm'
import { db } from '../../../db/client'
import { alertRules, alerts, users } from '../../../db/schema'
import { checkCooldown, setCooldown } from '../state'
import { sendSms } from '../../notifications/sms'
import { sendPushToUsers } from '../../notifications/push'
import { broadcastAlert } from '../../../socket'
import type { NormalisedTelemetry } from './telemetry'

const AFTER_HOURS_START = 18
const AFTER_HOURS_END = 6
const COOLDOWN_SECONDS = 300

export async function processAlerts(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry, geofenceEvents: any[]) {
  const rules = await db.select().from(alertRules).where(and(eq(alertRules.companyId, companyId), eq(alertRules.active, true)))

  for (const rule of rules) {
    await evaluateRule(rule, imei, companyId, vehicleId, record, geofenceEvents)
  }
}

async function evaluateRule(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry, geofenceEvents: any[]) {
  switch (rule.type) {
    case 'afterHours': return checkAfterHours(rule, imei, companyId, vehicleId, record)
    case 'speeding': return checkSpeeding(rule, imei, companyId, vehicleId, record)
    case 'engineFault': return checkEngineFault(rule, imei, companyId, vehicleId, record)
    case 'lowBattery': return checkLowBattery(rule, imei, companyId, vehicleId, record)
    case 'geofenceBreach': return checkGeofenceBreach(rule, companyId, vehicleId, geofenceEvents)
    case 'towing': return checkTowing(rule, imei, companyId, vehicleId, record)
    default: return null
  }
}

async function checkAfterHours(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  if (!record.ignition) return null
  const hour = record.time.getHours()
  if (!(hour >= AFTER_HOURS_START || hour < AFTER_HOURS_END)) return null

  const cooldownKey = `afterHours:${imei}`
  if (checkCooldown(cooldownKey)) return null
  setCooldown(cooldownKey, COOLDOWN_SECONDS)

  return fireAlert({ type: 'afterHours', imei, companyId, vehicleId, message: 'Van ignition on outside operating hours', severity: 'warning', record, rule })
}

async function checkSpeeding(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const limit = rule.speedLimit || 110
  if ((record.speed ?? 0) <= limit) return null

  const cooldownKey = `speeding:${imei}`
  if (checkCooldown(cooldownKey)) return null
  setCooldown(cooldownKey, COOLDOWN_SECONDS)

  return fireAlert({ type: 'speeding', imei, companyId, vehicleId, message: `Van travelling at ${record.speed} km/h`, severity: 'warning', record, rule })
}

async function checkEngineFault(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  if (!record.dtcCount) return null
  return fireAlert({ type: 'engineFault', imei, companyId, vehicleId, message: `Engine fault detected — ${record.dtcCount} DTC code(s)`, severity: 'critical', record, rule, noCooldown: true })
}

async function checkLowBattery(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const threshold = rule.voltageThreshold || 11.5
  if (!record.externalVoltage) return null
  if (record.externalVoltage >= threshold) return null

  const cooldownKey = `lowBattery:${imei}`
  if (checkCooldown(cooldownKey)) return null
  setCooldown(cooldownKey, COOLDOWN_SECONDS)

  return fireAlert({ type: 'lowBattery', imei, companyId, vehicleId, message: `Low battery voltage: ${record.externalVoltage}V`, severity: 'warning', record, rule })
}

async function checkGeofenceBreach(rule: any, companyId: string, vehicleId: string, geofenceEvents: any[]) {
  if (!geofenceEvents || geofenceEvents.length === 0) return null
  for (const event of geofenceEvents) {
    if (event.type === 'exit' && rule.zoneId === event.zoneId) {
      return fireAlert({
        type: 'geofenceBreach', companyId, vehicleId,
        message: `Van exited zone: ${event.zoneName}`, severity: 'warning',
        record: { time: event.timestamp, lng: event.lng, lat: event.lat } as any,
        rule, imei: event.imei,
      })
    }
  }
  return null
}

async function checkTowing(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  if (record.ignition) return null
  if ((record.speed ?? 0) < 5) return null
  return fireAlert({ type: 'towing', imei, companyId, vehicleId, message: 'Possible towing detected — moving with ignition off', severity: 'critical', record, rule, noCooldown: true })
}

async function fireAlert({ type, imei, companyId, vehicleId, message, severity, record, rule }: any) {
  const [alert] = await db.insert(alerts).values({
    type, imei, companyId, vehicleId, message, severity,
    timestamp: record.time, lat: record.lat, lng: record.lng,
  }).returning()

  if (severity === 'critical' && rule.smsNumber) {
    await sendSms(rule.smsNumber, `CLARITY FLEET ALERT: ${message}`)
  }

  // Reaches anyone with the app open right now.
  broadcastAlert(companyId, alert)

  // Reaches anyone who doesn't — a closed app never receives the socket emit above.
  try {
    const companyUsers = await db.select({ id: users.id }).from(users).where(eq(users.companyId, companyId))
    await sendPushToUsers(companyUsers.map((u) => u.id), 'Clarity Fleet Alert', message, { type, vehicleId })
  } catch (pushErr: any) {
    console.error('[Push] Alert push failed:', pushErr.message)
  }

  return alert
}
