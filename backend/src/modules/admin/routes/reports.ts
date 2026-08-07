// Ported from api/routes/reports.js. These are the fast, synchronous report endpoints — direct
// Drizzle queries against safety_scores / telemetry (TimescaleDB hypertable) / trips / vehicles.
// Separate from the new async report-job infrastructure (fleet/reports-queue.ts,
// fleet/routes/reports-async.ts) — not touched here.
import express from 'express'
import { eq, and, gte, lte, desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { safetyScores, telemetry, trips, vehicles } from '../../../db/schema'
import { requireAuth, requireCompany, requireTier } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

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

  const idleRecords = records.filter(r => r.speed === 0 && r.fuelLevel)
  return res.success({ total: records.length, idleCount: idleRecords.length, records: idleRecords })
}))

router.get('/trip-summary', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to } = req.query
  const conditions = [eq(trips.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId as string))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from as string)))
    conditions.push(lte(trips.startTime, new Date(to as string)))
  }

  const tripRows = await db.select().from(trips).where(and(...conditions))

  const totalKm = tripRows.reduce((s, t) => s + Number(t.distanceKm || 0), 0)
  const summary = {
    totalTrips: tripRows.length,
    totalKm,
    totalDuration: tripRows.reduce((s, t) => s + (t.durationMinutes || 0), 0),
    avgKmPerTrip: tripRows.length ? (totalKm / tripRows.length).toFixed(1) : 0,
  }

  return res.success({ summary, trips: tripRows })
}))

router.get('/vehicle-health', requireAuth, requireCompany,
  requireTier('mid'), asyncRoute(async (req, res) => {
  const fleet = await db.select().from(vehicles).where(eq(vehicles.companyId, req.companyId!))

  const healthData = await Promise.all(
    fleet.map(async (v) => {
      const [latest] = await db.select().from(telemetry)
        .where(eq(telemetry.vehicleId, v.id))
        .orderBy(desc(telemetry.time))
        .limit(1)
      return { vehicle: v, latest: latest || null }
    })
  )

  return res.success(healthData)
}))

export default router
