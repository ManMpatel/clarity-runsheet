// Ported from api/routes/trips.js. Mongo native driver -> Drizzle/Postgres. Trip start/end
// location is now plain lat/lng columns (startLat/startLng/endLat/endLng), not embedded GeoJSON —
// see db/schema/trips.ts. Replay points now come from the telemetry hypertable's lat/lng columns
// instead of a `location.coordinates` GeoJSON field.
import express from 'express'
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { trips, vehicles, telemetry } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to, page = '1', limit = '20' } = req.query as Record<string, string>

  const conditions = [eq(trips.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from)))
    conditions.push(lte(trips.endTime, new Date(to)))
  }

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)

  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(trips).where(and(...conditions))

  const list = await db.select().from(trips)
    .where(and(...conditions))
    .orderBy(desc(trips.startTime))
    .offset((pageNum - 1) * limitNum)
    .limit(limitNum)

  const vIds = [...new Set(list.map((t) => t.vehicleId).filter(Boolean))]
  const vDocs = vIds.length ? await db.select().from(vehicles).where(inArray(vehicles.id, vIds)) : []
  const vMap = Object.fromEntries(vDocs.map((v) => [v.id, v.name]))
  const enriched = list.map((t) => ({ ...t, vehicleName: vMap[t.vehicleId] || null }))

  return res.success({ trips: enriched, total, page: pageNum })
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, req.params.id), eq(trips.companyId, req.companyId!)))
    .limit(1)
  if (!trip) return res.fail(null, 'Trip not found', 404)
  return res.success(trip)
}))

router.get('/:id/replay', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, req.params.id), eq(trips.companyId, req.companyId!)))
    .limit(1)
  if (!trip) return res.fail(null, 'Trip not found', 404)

  const conditions = [
    eq(telemetry.companyId, req.companyId!),
    eq(telemetry.vehicleId, trip.vehicleId),
    gte(telemetry.time, trip.startTime),
  ]
  if (trip.endTime) conditions.push(lte(telemetry.time, trip.endTime))

  const points = await db.select({
    time: telemetry.time,
    lat: telemetry.lat,
    lng: telemetry.lng,
    speed: telemetry.speed,
    angle: telemetry.angle,
  }).from(telemetry)
    .where(and(...conditions))
    .orderBy(asc(telemetry.time))

  return res.success({ trip, points })
}))

export default router
