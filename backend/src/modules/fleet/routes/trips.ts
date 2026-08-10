// Ported from api/routes/trips.js. Mongo native driver -> Drizzle/Postgres. Trip start/end
// location is now plain lat/lng columns (startLat/startLng/endLat/endLng), not embedded GeoJSON —
// see db/schema/trips.ts. Replay points now come from the telemetry hypertable's lat/lng columns
// instead of a `location.coordinates` GeoJSON field.
import express from 'express'
import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { trips, vehicles, telemetry } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

const MAX_PAGE_SIZE = 100
const MAX_REPLAY_POINTS = 2000

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to, page, limit = '20', cursor } = req.query as Record<string, string>

  const conditions = [eq(trips.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from)))
    conditions.push(lte(trips.endTime, new Date(to)))
  }

  const limitNum = Math.min(parseInt(limit) || 20, MAX_PAGE_SIZE)

  async function enrich(list: (typeof trips.$inferSelect)[]) {
    const vIds = [...new Set(list.map((t) => t.vehicleId).filter(Boolean))]
    const vDocs = vIds.length ? await db.select().from(vehicles).where(inArray(vehicles.id, vIds)) : []
    const vMap = Object.fromEntries(vDocs.map((v) => [v.id, v.name]))
    return list.map((t) => ({ ...t, vehicleName: vMap[t.vehicleId] || null }))
  }

  // Cursor pagination for mobile's infinite-scroll trip list — see the matching comment on
  // GET /alerts. `page` (web's existing offset UI) still works unchanged.
  if (cursor || page === undefined) {
    if (cursor) conditions.push(lt(trips.startTime, new Date(cursor)))

    const list = await db.select().from(trips)
      .where(and(...conditions))
      .orderBy(desc(trips.startTime))
      .limit(limitNum + 1)

    const hasMore = list.length > limitNum
    const page2 = hasMore ? list.slice(0, limitNum) : list
    const nextCursor = hasMore ? page2[page2.length - 1].startTime.toISOString() : null

    return res.success({ trips: await enrich(page2), nextCursor })
  }

  const pageNum = parseInt(page) || 1

  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(trips).where(and(...conditions))

  const list = await db.select().from(trips)
    .where(and(...conditions))
    .orderBy(desc(trips.startTime))
    .offset((pageNum - 1) * limitNum)
    .limit(limitNum)

  return res.success({ trips: await enrich(list), total, page: pageNum })
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, (req.params.id as string)), eq(trips.companyId, req.companyId!)))
    .limit(1)
  if (!trip) return res.fail(null, 'Trip not found', 404)
  return res.success(trip)
}))

router.get('/:id/replay', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, (req.params.id as string)), eq(trips.companyId, req.companyId!)))
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

  // Was unbounded — a multi-hour trip on a device reporting every few seconds returns thousands
  // of points, expensive to ship over cellular and to render as a polyline. Even decimation
  // (every Nth point) keeps the route shape recognisable while capping payload size; always
  // includes the first and last point so the replay's start/end markers stay accurate.
  const decimated = points.length <= MAX_REPLAY_POINTS
    ? points
    : points.filter((_, i) => i % Math.ceil(points.length / MAX_REPLAY_POINTS) === 0 || i === points.length - 1)

  return res.success({ trip, points: decimated })
}))

export default router
