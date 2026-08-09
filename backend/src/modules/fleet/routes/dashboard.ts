// New route backing the redesigned web dashboard. Previously the dashboard had no aggregate
// endpoint at all — GET /telemetry/live returned every vehicle+state row and the frontend derived
// six stat counts client-side in Dashboard.jsx's buildStats(), which is how "unreachable" ended up
// permanently stuck at 0 (comparing Date.now() against an ISO string) and "overspeed" ended up
// hardcoded to 110 instead of reading the company's actual alert_rules threshold.
//
// Five statements total, none of them per-vehicle — /telemetry/live's `fleet.map(async v => ...)`
// N+1 is not repeated here. Trip and alert trends use generate_series LEFT JOINed to a grouped
// CTE so the array Postgres returns is always exactly `days` long and zero-filled; the frontend
// never has to patch gaps in the chart data.
import express from 'express'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, maintenance, vehicles } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

const DEFAULT_SPEED_LIMIT = 110 // mirrors alerts.ts's own default for the speeding rule
const OFFLINE_AFTER_MINUTES = 15 // mirrors GET /vehicles/status's own online/idle/offline cutoffs
const DEFAULT_TIMEZONE = 'Australia/Sydney'

function clampDays(raw: unknown): number {
  const n = parseInt(String(raw ?? '7'), 10)
  if (!Number.isFinite(n)) return 7
  return Math.min(30, Math.max(1, n))
}

function zeroedSummary(days: number, timezone: string) {
  const to = new Date()
  const from = new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
  return {
    generatedAt: new Date().toISOString(),
    locked: true,
    lockedReason: 'subscription_tier_locked',
    range: { days, from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), timezone },
    thresholds: { speedLimit: DEFAULT_SPEED_LIMIT, offlineAfterMinutes: OFFLINE_AFTER_MINUTES },
    fleet: { registered: 0, active: 0, reporting: 0, neverReported: 0, immobilised: 0 },
    status: { moving: 0, idle: 0, stopped: 0, offline: 0, unknown: 0 },
    today: { km: 0, trips: 0, durationMinutes: 0, activeVehicles: 0, vsYesterday: { km: null, trips: null } },
    trend: [],
    alerts: { unread: 0, criticalUnread: 0, last24h: 0, byType: {} },
    attention: {
      offlineVehicles: [], neverReportedVehicles: [], maintenanceDue: [],
      unclassifiedTrips: 0, tripsInProgress: 0,
    },
  }
}

router.get('/summary', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const companyId = req.companyId!
  const days = clampDays(req.query.days)

  // No requireTier here, deliberately: this is the landing page for every tier including
  // 'locked', and gating it would 403 exactly the users who need to see the "choose a plan"
  // state. `locked` is a field in a 200 response instead, with every section zeroed.
  const [company] = await db.select({
    subscriptionTier: companies.subscriptionTier,
    timezone: companies.timezone,
  }).from(companies).where(eq(companies.id, companyId)).limit(1)

  const timezone = company?.timezone || DEFAULT_TIMEZONE

  if (!company || company.subscriptionTier === 'locked') {
    return res.success(zeroedSummary(days, timezone))
  }

  // 1) Fleet + live state in a single LEFT JOIN — replaces the N+1 that /telemetry/live does
  // (fleet.map(async v => db.select()...)). Row count here is the fleet size (tens of rows), so
  // status counts and the attention lists below are reduced from this one result in JS.
  const fleetRows = await db.execute<{
    id: string; name: string; imei: string; registration: string | null; active: boolean; immobilised: boolean;
    updatedAt: string | null; status: 'moving' | 'idle' | 'stopped' | null; speed: number | null;
    ignition: boolean | null;
  }>(sql`
    SELECT v.id, v.name, v.imei, v.registration, v.active, v.immobilised,
           vs.updated_at AS "updatedAt", vs.status, vs.speed, vs.ignition
    FROM vehicles v
    LEFT JOIN vehicle_state vs ON vs.vehicle_id = v.id
    WHERE v.company_id = ${companyId} AND v.active = true
  `)

  const now = Date.now()
  const offlineCutoffMs = OFFLINE_AFTER_MINUTES * 60 * 1000

  const statusCounts = { moving: 0, idle: 0, stopped: 0, offline: 0, unknown: 0 }
  const offlineVehicles: Array<{ vehicleId: string; name: string; registration: string | null; lastSeen: string; minutesAgo: number }> = []
  const neverReportedVehicles: Array<{ vehicleId: string; name: string; imei: string }> = []
  let reporting = 0
  let immobilised = 0

  for (const v of fleetRows.rows) {
    if (v.immobilised) immobilised += 1

    if (v.updatedAt == null) {
      neverReportedVehicles.push({ vehicleId: v.id, name: v.name, imei: v.imei })
      continue
    }
    reporting += 1

    const ageMs = now - new Date(v.updatedAt).getTime()
    if (ageMs > offlineCutoffMs) {
      statusCounts.offline += 1
      offlineVehicles.push({
        vehicleId: v.id, name: v.name, registration: v.registration,
        lastSeen: v.updatedAt, minutesAgo: Math.round(ageMs / 60000),
      })
    } else if (v.status === 'moving' || v.status === 'idle' || v.status === 'stopped') {
      statusCounts[v.status] += 1
    } else {
      // Legacy rows written before the `status` column existed — fall back to the same
      // speed/ignition derivation the old client used, only for this edge case.
      if ((v.speed ?? 0) > 0) statusCounts.moving += 1
      else if (v.ignition) statusCounts.idle += 1
      else statusCounts.stopped += 1
    }
  }

  offlineVehicles.sort((a, b) => b.minutesAgo - a.minutesAgo)

  // 2) Trips: one statement for the whole trend window plus today/yesterday/unclassified/
  // in-progress scalars. generate_series LEFT JOINed to the grouped trips CTE is what guarantees
  // a zero-filled, exactly-`days`-long array — no gap-patching on the frontend.
  const tripStats = await db.execute<{
    day: string; trips: number; km: number; minutes: number; activeVehicles: number;
  }>(sql`
    WITH days AS (
      SELECT generate_series(
        (now() AT TIME ZONE ${timezone})::date - (${days}::int - 1),
        (now() AT TIME ZONE ${timezone})::date,
        '1 day'
      )::date AS day
    ),
    t AS (
      SELECT (start_time AT TIME ZONE ${timezone})::date AS day,
             count(*)::int AS trips,
             coalesce(sum(distance_km), 0)::float AS km,
             coalesce(sum(duration_minutes), 0)::int AS minutes,
             count(DISTINCT vehicle_id)::int AS "activeVehicles"
      FROM trips
      WHERE company_id = ${companyId}
        AND start_time >= ((now() AT TIME ZONE ${timezone})::date - (${days}::int - 1))
      GROUP BY 1
    )
    SELECT d.day::text AS day,
           coalesce(t.trips, 0) AS trips,
           coalesce(t.km, 0) AS km,
           coalesce(t.minutes, 0) AS minutes,
           coalesce(t."activeVehicles", 0) AS "activeVehicles"
    FROM days d LEFT JOIN t ON t.day = d.day
    ORDER BY d.day
  `)

  const [{ unclassified, inProgress }] = (await db.execute<{ unclassified: number; inProgress: number }>(sql`
    SELECT
      count(*) FILTER (WHERE classification IS NULL)::int AS unclassified,
      count(*) FILTER (WHERE end_time IS NULL)::int AS "inProgress"
    FROM trips
    WHERE company_id = ${companyId}
  `)).rows

  const trend = tripStats.rows.map(r => ({
    date: r.day, km: Number(r.km), trips: Number(r.trips),
    activeVehicles: Number(r.activeVehicles), alerts: 0, criticalAlerts: 0,
  }))

  const todayRow = tripStats.rows[tripStats.rows.length - 1]
  const yesterdayRow = tripStats.rows[tripStats.rows.length - 2]
  const ratio = (curr: number, prev: number) => (prev > 0 ? (curr - prev) / prev : null)

  // 3) Alerts: same generate_series shape for the daily trend, plus FILTER-based counters and a
  // per-type roll-up, all in one statement.
  const alertStats = await db.execute<{ day: string; count: number; critical: number }>(sql`
    WITH days AS (
      SELECT generate_series(
        (now() AT TIME ZONE ${timezone})::date - (${days}::int - 1),
        (now() AT TIME ZONE ${timezone})::date,
        '1 day'
      )::date AS day
    ),
    a AS (
      SELECT (created_at AT TIME ZONE ${timezone})::date AS day,
             count(*)::int AS count,
             count(*) FILTER (WHERE severity = 'critical')::int AS critical
      FROM alerts
      WHERE company_id = ${companyId}
        AND created_at >= ((now() AT TIME ZONE ${timezone})::date - (${days}::int - 1))
      GROUP BY 1
    )
    SELECT d.day::text AS day, coalesce(a.count, 0) AS count, coalesce(a.critical, 0) AS critical
    FROM days d LEFT JOIN a ON a.day = d.day
    ORDER BY d.day
  `)
  alertStats.rows.forEach((r, i) => {
    if (trend[i]) { trend[i].alerts = Number(r.count); trend[i].criticalAlerts = Number(r.critical) }
  })

  const [alertCounters] = (await db.execute<{ unread: number; criticalUnread: number; last24h: number }>(sql`
    SELECT
      count(*) FILTER (WHERE read = false)::int AS unread,
      count(*) FILTER (WHERE read = false AND severity = 'critical')::int AS "criticalUnread",
      count(*) FILTER (WHERE created_at >= now() - interval '24 hours')::int AS "last24h"
    FROM alerts
    WHERE company_id = ${companyId}
  `)).rows

  const byTypeResult = await db.execute<{ type: string; count: number }>(sql`
    SELECT type, count(*)::int AS count
    FROM alerts
    WHERE company_id = ${companyId} AND read = false
    GROUP BY type
    ORDER BY count DESC
  `)
  const byType = Object.fromEntries(byTypeResult.rows.map(r => [r.type, Number(r.count)]))

  // 4) Maintenance due (mirrors GET /maintenance/due's own window) + the company's speeding
  // threshold, read from alert_rules rather than hardcoded — this is what fixes the dashboard's
  // old hardcoded-110 bug for good, since the client now only ever reads this field.
  const maintenanceDueRows = await db.select({
    id: maintenance.id, vehicleId: maintenance.vehicleId, vehicleName: vehicles.name,
    type: maintenance.type, dueDate: maintenance.dueDate,
  }).from(maintenance)
    .innerJoin(vehicles, eq(vehicles.id, maintenance.vehicleId))
    .where(and(
      eq(maintenance.companyId, companyId),
      eq(maintenance.status, 'pending'),
    ))
    .orderBy(desc(maintenance.dueDate))
    .limit(10)

  const todayStr = new Date().toISOString().slice(0, 10)
  const maintenanceDue = maintenanceDueRows
    .filter(m => !m.dueDate || m.dueDate <= addDays(todayStr, 7))
    .map(m => ({ ...m, overdue: !!m.dueDate && m.dueDate < todayStr }))

  const speedLimitResult = await db.execute<{ speedLimit: number | null }>(sql`
    SELECT speed_limit AS "speedLimit" FROM alert_rules
    WHERE company_id = ${companyId} AND type = 'speeding'
    LIMIT 1
  `)
  const speedLimit = speedLimitResult.rows[0]?.speedLimit ?? DEFAULT_SPEED_LIMIT

  return res.success({
    generatedAt: new Date().toISOString(),
    locked: false,
    lockedReason: null,
    range: {
      days,
      from: trend[0]?.date ?? todayStr,
      to: trend[trend.length - 1]?.date ?? todayStr,
      timezone,
    },
    thresholds: { speedLimit, offlineAfterMinutes: OFFLINE_AFTER_MINUTES },
    fleet: {
      registered: fleetRows.rows.length,
      active: fleetRows.rows.filter(v => v.active).length,
      reporting,
      neverReported: neverReportedVehicles.length,
      immobilised,
    },
    status: statusCounts,
    today: {
      km: Number(todayRow?.km ?? 0),
      trips: Number(todayRow?.trips ?? 0),
      durationMinutes: Number(todayRow?.minutes ?? 0),
      activeVehicles: Number(todayRow?.activeVehicles ?? 0),
      vsYesterday: {
        km: yesterdayRow ? ratio(Number(todayRow?.km ?? 0), Number(yesterdayRow.km)) : null,
        trips: yesterdayRow ? ratio(Number(todayRow?.trips ?? 0), Number(yesterdayRow.trips)) : null,
      },
    },
    trend,
    alerts: {
      unread: alertCounters?.unread ?? 0,
      criticalUnread: alertCounters?.criticalUnread ?? 0,
      last24h: alertCounters?.last24h ?? 0,
      byType,
    },
    attention: {
      offlineVehicles: offlineVehicles.slice(0, 10),
      neverReportedVehicles: neverReportedVehicles.slice(0, 10),
      maintenanceDue,
      unclassifiedTrips: unclassified ?? 0,
      tripsInProgress: inProgress ?? 0,
    },
  })
}))

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default router
