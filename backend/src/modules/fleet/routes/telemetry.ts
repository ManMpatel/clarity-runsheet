// Ported from api/routes/telemetry.js. Mongo native driver -> Drizzle/Postgres, and the old
// Redis `van:state:{imei}` live-state cache -> the `vehicle_state` table (single source of truth
// for live state now, no more Redis in the read path). History still reads a time-series
// collection, now the `telemetry` TimescaleDB hypertable instead of a Mongo time-series collection.
import express from 'express'
import { and, asc, eq, gte, lte } from 'drizzle-orm'
import { db } from '../../../db/client'
import { vehicles, vehicleState, telemetry } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

router.get('/live', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const fleet = await db.select().from(vehicles)
    .where(and(eq(vehicles.companyId, req.companyId!), eq(vehicles.active, true)))

  const states = await Promise.all(
    fleet.map(async (v) => {
      const [state] = await db.select().from(vehicleState).where(eq(vehicleState.vehicleId, v.id)).limit(1)
      return { vehicle: v, state: state || null }
    })
  )
  return res.success(states)
}))

router.get('/history', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to, limit = '1000' } = req.query as Record<string, string>
  if (!vehicleId || !from || !to) {
    return res.fail(null, 'vehicleId, from, to required')
  }

  const records = await db.select().from(telemetry)
    .where(and(
      eq(telemetry.companyId, req.companyId!),
      eq(telemetry.vehicleId, vehicleId),
      gte(telemetry.time, new Date(from)),
      lte(telemetry.time, new Date(to)),
    ))
    .orderBy(asc(telemetry.time))
    .limit(parseInt(limit))

  return res.success(records)
}))

export default router
