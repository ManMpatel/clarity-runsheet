// Ported from worker/processors/alerts.js. Cooldowns move to the in-memory state.ts map. The
// biggest behavioral addition (per Phase 4/5 spec): every fired alert now calls BOTH the
// Socket.io broadcast (reaches anyone with the app open) AND the push dispatch (reaches anyone
// who doesn't) — these are two different jobs and the old code only did the push half via a
// direct users-collection query, with no socket emit for alerts at all (broadcastAlert existed
// in broadcaster/socketio.js but was only ever called from worker/index.js for geofence/driver
// events, not from processAlerts). Both now fire from one place.
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { alertRules, alerts, fbtSettings, users } from '../../../db/schema'
import { checkCooldown, setCooldown } from '../state'
import { classifyTrip } from '../fbt-classifier'
import { sendSms } from '../../notifications/sms'
import { sendPushToUsers } from '../../notifications/push'
import { broadcastAlert } from '../../../socket'
import type { NormalisedTelemetry } from './telemetry'

const AFTER_HOURS_START = 18
const AFTER_HOURS_END = 6
const COOLDOWN_SECONDS = 300
// Volts — far below the 11.5V lowBattery threshold, deliberately, so a flat battery still reads
// as lowBattery (warning) and a cut/severed power harness reads as tamper (critical) instead.
const TAMPER_VOLTAGE = 4.0

type AlertRuleType = 'afterHours' | 'speeding' | 'engineFault' | 'lowBattery' | 'geofenceBreach' | 'towing' | 'crash' | 'tamper'

// Defaults for every type this processor evaluates, used when a company has no alert_rules row
// for that type yet. Without this, a brand-new company has zero rows and even the types the
// Settings UI labels "Always on" (engineFault, lowBattery, towing, crash, tamper) silently never
// fire — the DB row was always required even though the UI implied otherwise.
const DEFAULT_ALERT_RULES: Record<AlertRuleType, { active: boolean; speedLimit?: number; voltageThreshold?: string }> = {
  afterHours:     { active: true },
  speeding:       { active: true, speedLimit: 110 },
  engineFault:    { active: true },
  lowBattery:     { active: true, voltageThreshold: '11.5' },
  geofenceBreach: { active: true },
  towing:         { active: true },
  crash:          { active: true },
  tamper:         { active: true },
}

export async function processAlerts(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry, geofenceEvents: any[]) {
  const savedRules = await db.select().from(alertRules).where(eq(alertRules.companyId, companyId))
  const savedByType = new Map(savedRules.map((r) => [r.type, r]))

  for (const type of Object.keys(DEFAULT_ALERT_RULES) as AlertRuleType[]) {
    // Company-saved row wins outright (including active:false); defaults only fill the gap when
    // nothing has ever been saved for this type.
    const rule = savedByType.get(type) ?? { ...DEFAULT_ALERT_RULES[type], type, companyId }
    if (!rule.active) continue
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
    case 'crash': return checkCrash(rule, imei, companyId, vehicleId, record)
    case 'tamper': return checkTamper(rule, imei, companyId, vehicleId, record)
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
  return fireAlert({ type: 'engineFault', imei, companyId, vehicleId, message: `Engine fault detected — ${record.dtcCount} DTC code(s)`, severity: 'critical', record, rule })
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

// Per-zone alertOnEntry/alertOnExit/activeHoursOnly (attached in processors/geofence.ts) decide
// whether THIS zone wants an alert — alertRules.type === 'geofenceBreach' only gates the feature
// on/off company-wide, same as every other rule type.
async function checkGeofenceBreach(rule: any, companyId: string, vehicleId: string, geofenceEvents: any[]) {
  if (!geofenceEvents || geofenceEvents.length === 0) return null

  const fired: any[] = []
  for (const event of geofenceEvents) {
    const wantsAlert = (event.type === 'exit' && event.alertOnExit) || (event.type === 'enter' && event.alertOnEntry)
    if (!wantsAlert) continue

    if (event.activeHoursOnly && !(await isWithinBusinessHours(companyId, event.timestamp))) continue

    const cooldownKey = `geofence:${vehicleId}:${event.zoneId}:${event.type}`
    if (checkCooldown(cooldownKey)) continue
    setCooldown(cooldownKey, COOLDOWN_SECONDS)

    const verb = event.type === 'enter' ? 'entered' : 'exited'
    fired.push(await fireAlert({
      type: 'geofenceBreach', companyId, vehicleId,
      message: `Vehicle ${verb} zone: ${event.zoneName}`, severity: 'warning',
      record: { time: event.timestamp, lng: event.lng, lat: event.lat } as any,
      rule, imei: event.imei,
    }))
  }
  return fired
}

// Reuses the canonical business-hours classifier (see fbt-classifier.ts's header for why a
// second hand-rolled comparison here would be exactly the kind of divergence that already broke
// FBT classification once). No FBT settings saved yet -> fall through to that classifier's own
// defaults (Mon-Fri 08:00-17:00) rather than leaving activeHoursOnly unenforceable.
async function isWithinBusinessHours(companyId: string, timestamp: Date): Promise<boolean> {
  const [settings] = await db.select().from(fbtSettings).where(eq(fbtSettings.companyId, companyId)).limit(1)
  const effective = settings ?? { businessDays: null, businessHoursStart: null, businessHoursEnd: null }
  return classifyTrip(timestamp, effective as any) === 'business'
}

async function checkTowing(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  if (record.ignition) return null
  if ((record.speed ?? 0) < 5) return null
  return fireAlert({ type: 'towing', imei, companyId, vehicleId, message: 'Possible towing detected — moving with ignition off', severity: 'critical', record, rule })
}

// AVL ID 252 (unplug) is captured into telemetry.extras.unplug by the codec8 parser once
// avl-ids.ts maps it — see that file. A power-cut reading this low can't be a normal deep-sleep
// dip; TAMPER_VOLTAGE sits well under lowBattery's 11.5V default specifically so the two checks
// never compete for the same reading.
async function checkTamper(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const unplugged = !!(record.extras as any)?.unplug
  const powerCut = record.externalVoltage != null && record.externalVoltage < TAMPER_VOLTAGE
  if (!unplugged && !powerCut) return null

  const cooldownKey = `tamper:${imei}`
  if (checkCooldown(cooldownKey)) return null
  setCooldown(cooldownKey, COOLDOWN_SECONDS)

  const message = unplugged ? 'Tracker unplugged from vehicle' : 'Tracker external power lost'
  return fireAlert({ type: 'tamper', imei, companyId, vehicleId, message, severity: 'critical', record, rule })
}

// driver-events.ts already logs every crash to driver_events for scoring; this is the alert half
// (notification + SMS) that never existed even though 'crash' has been in alertTypeEnum all along.
async function checkCrash(rule: any, imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  if (!record.crashDetection || record.crashDetection <= 0) return null
  return fireAlert({ type: 'crash', imei, companyId, vehicleId, message: 'Crash detected', severity: 'critical', record, rule })
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
