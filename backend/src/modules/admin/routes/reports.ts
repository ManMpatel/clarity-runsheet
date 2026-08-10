// Ported from api/routes/reports.js. These are the fast, synchronous report endpoints — direct
// Drizzle queries against safety_scores / telemetry (TimescaleDB hypertable) / trips / vehicles.
// Separate from the new async report-job infrastructure (fleet/reports-queue.ts,
// fleet/routes/reports-async.ts) — not touched here.
import express from 'express'
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { safetyScores, telemetry, trips } from '../../../db/schema'
import { requireAuth, requireCompany, requireTier } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

// These are the "fast, synchronous" reports (see file header) — deliberately capped rather than
// paginated, since exceeding the cap is the caller's cue to use the async /reports job endpoint
// (fleet/routes/reports-async.ts) instead, which has no such limit.
const SYNC_REPORT_ROW_CAP = 5000

router.get('/driver-scores', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { from, to } = req.query
  const conditions = [eq(safetyScores.companyId, req.companyId!)]
  if (from && to) {
    conditions.push(gte(safetyScores.weekStart, from as string))
    conditions.push(lte(safetyScores.weekStart, to as string))
  }

  const scores = await db.select().from(safetyScores)
    .where(and(...conditions))
    .orderBy(desc(safetyScores.weekStart))

  return res.success(scores)
}))

router.get('/fuel-idle', requireAuth, requireCompany,
  requireTier('mid'), asyncRoute(async (req, res) => {
  const { vehicleId, from, to } = req.query
  const conditions = [
    eq(telemetry.companyId, req.companyId!),
    gte(telemetry.time, new Date(from as string)),
    lte(telemetry.time, new Date(to as string)),
  ]
  if (vehicleId) conditions.push(eq(telemetry.vehicleId, vehicleId as string))

  const records = await db.select({
    time: telemetry.time,
    speed: telemetry.speed,
    fuelLevel: telemetry.fuelLevel,
    vehicleId: telemetry.vehicleId,
  }).from(telemetry).where(and(...conditions))
    .orderBy(desc(telemetry.time))
    .limit(SYNC_REPORT_ROW_CAP)

  const idleRecords = records.filter(r => r.speed === 0 && r.fuelLevel)
  return res.success({
    total: records.length,
    idleCount: idleRecords.length,
    records: idleRecords,
    truncated: records.length === SYNC_REPORT_ROW_CAP,
  })
}))

router.get('/trip-summary', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to } = req.query
  const conditions = [eq(trips.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId as string))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from as string)))
    conditions.push(lte(trips.startTime, new Date(to as string)))
  }

  // Summary totals (totalKm etc.) are computed from every matching row, not just the capped list
  // returned below, so a truncated `trips` array never skews the numbers the client displays.
  const sumKm = (rows: typeof allTrips) => rows.reduce((s, t) => s + Number(t.distanceKm || 0), 0)
  const allTrips = await db.select().from(trips).where(and(...conditions))
  const totalKm = sumKm(allTrips)
  const summary = {
    totalTrips: allTrips.length,
    totalKm,
    totalDuration: allTrips.reduce((s, t) => s + (t.durationMinutes || 0), 0),
    avgKmPerTrip: allTrips.length ? (totalKm / allTrips.length).toFixed(1) : 0,
  }

  const capped = allTrips
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
    .slice(0, SYNC_REPORT_ROW_CAP)

  return res.success({ summary, trips: capped, truncated: allTrips.length > SYNC_REPORT_ROW_CAP })
}))

router.get('/vehicle-health', requireAuth, requireCompany,
  requireTier('mid'), asyncRoute(async (req, res) => {
  // Was one query per vehicle (fleet.map(async v => db.select()...)) — DISTINCT ON gets the
  // latest telemetry row per vehicle in a single query, same LEFT-JOIN-shaped fix as
  // /telemetry/live and /vehicles/status above.
  const healthData = await db.execute<{
    id: string; name: string; imei: string; time: string | null; speed: number | null;
    fuelLevel: number | null; engineRpm: number | null; coolantTemp: number | null; dtcCount: number | null;
  }>(sql`
    SELECT v.id, v.name, v.imei,
           t.time, t.speed, t.fuel_level AS "fuelLevel", t.engine_rpm AS "engineRpm",
           t.coolant_temp AS "coolantTemp", t.dtc_count AS "dtcCount"
    FROM vehicles v
    LEFT JOIN LATERAL (
      SELECT * FROM telemetry WHERE vehicle_id = v.id ORDER BY time DESC LIMIT 1
    ) t ON true
    WHERE v.company_id = ${req.companyId!}
  `)

  return res.success(healthData.rows.map((row) => ({
    vehicle: { id: row.id, name: row.name, imei: row.imei },
    latest: row.time ? row : null,
  })))
}))

export default router
