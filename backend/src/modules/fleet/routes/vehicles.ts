// Ported from api/routes/vehicles.js. Mongo native driver -> Drizzle/Postgres, Redis
// `van:state:{imei}` cache -> the `vehicle_state` table (now the single source of truth for
// live vehicle state, see vehicle-state.ts schema), and the old `redis.publish('device:commands', ...)`
// relay for cut/restore -> an internal HTTP call to the tcp-listener process (see
// modules/tcp-listener/queue/commands.ts, which now runs a small internal HTTP server in place
// of the old Redis pub/sub channel).
import express from 'express'
import { and, eq, ne, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { vehicles, vehicleState, vehicleTierHistory, vehicleImmobiliseHistory, companies } from '../../../db/schema'
import { requireAuth, requireRole, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

const TCP_INTERNAL_URL = process.env.TCP_INTERNAL_URL || 'http://localhost:4001'

// No poll loop existed in the old Redis-based route (it only did a single state read before
// publishing) — these constants mirror the tcp-listener's own RESPONSE_TTL_MS (60s) window for
// a command to be acked, polled every 2s (30 attempts) so we don't hammer the internal server.
const COMMAND_POLL_INTERVAL_MS = 2000
const COMMAND_POLL_MAX_ATTEMPTS = 30

async function pollCommandStatus(imei: string) {
  for (let attempt = 0; attempt < COMMAND_POLL_MAX_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, COMMAND_POLL_INTERVAL_MS))
    try {
      const res = await fetch(`${TCP_INTERNAL_URL}/internal/commands/${imei}/status`)
      const status: any = await res.json()
      if (status.status === 'acked' || status.status === 'timeout') return status
    } catch (err: any) {
      console.error('[Vehicles] Command poll error:', err.message)
    }
  }
  return { status: 'timeout' }
}

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const fleet = await db.select().from(vehicles)
    .where(eq(vehicles.companyId, req.companyId!))
    .orderBy(vehicles.name)
  return res.success(fleet)
}))

router.get('/status', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const fleet = await db.select().from(vehicles).where(eq(vehicles.companyId, req.companyId!))

  const status = await Promise.all(fleet.map(async (v) => {
    const [state] = await db.select().from(vehicleState).where(eq(vehicleState.vehicleId, v.id)).limit(1)
    const lastSeen = state?.updatedAt || null
    const ageMs = lastSeen ? Date.now() - new Date(lastSeen).getTime() : null

    let vState = 'offline'
    if (ageMs !== null) {
      if (ageMs < 2 * 60 * 1000) vState = 'online'
      else if (ageMs < 15 * 60 * 1000) vState = 'idle'
    }

    return { vehicleId: v.id, lastSeen, state: vState }
  }))

  return res.success(status)
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  return res.success(vehicle)
}))

router.post('/', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, imei, registration, make, model, year, driverMobile } = req.body
  if (!name || !imei) return res.fail(null, 'Name and IMEI required')

  const [existing] = await db.select().from(vehicles).where(eq(vehicles.imei, imei)).limit(1)
  if (existing) return res.fail(null, 'IMEI already registered', 409)

  try {
    const [vehicle] = await db.insert(vehicles).values({
      companyId: req.companyId!,
      name,
      imei,
      registration: registration || null,
      make: make || null,
      model: model || null,
      year: year || null,
      driverMobile: driverMobile || null,
      tier: 'entry',
      tierChangesRemaining: 3,
      active: true,
    }).returning()
    return res.success(vehicle, 'Vehicle created')
  } catch (err: any) {
    if (err.code === '23505') return res.fail(null, 'IMEI already registered', 409)
    throw err
  }
}))

router.put('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, registration, make, model, year, driverMobile, active } = req.body

  const [updated] = await db.update(vehicles).set({
    name, registration, make, model, year, driverMobile, active, updatedAt: new Date(),
  }).where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Vehicle not found', 404)
  return res.success(updated)
}))

router.delete('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [updated] = await db.update(vehicles).set({ active: false, updatedAt: new Date() })
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Vehicle not found', 404)
  return res.success({ success: true })
}))

router.put('/:id/tier', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { tier } = req.body
  if (!['entry', 'mid', 'top'].includes(tier)) {
    return res.fail(null, 'Invalid tier')
  }

  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  if (vehicle.tierChangesRemaining <= 0) {
    return res.fail(null, 'No tier changes remaining. Contact support.', 403)
  }

  const [company] = await db.select().from(companies).where(eq(companies.id, req.companyId!)).limit(1)

  const slotsByTier: Record<string, number> = {
    entry: company.entrySlots,
    mid: company.midSlots,
    top: company.topSlots,
  }
  const totalSlots = slotsByTier[tier] || 0

  const [{ count: usedSlots }] = await db.select({ count: sql<number>`count(*)::int` }).from(vehicles)
    .where(and(
      eq(vehicles.companyId, req.companyId!),
      eq(vehicles.tier, tier as 'entry' | 'mid' | 'top'),
      eq(vehicles.active, true),
      ne(vehicles.id, vehicle.id),
    ))

  if (usedSlots >= totalSlots) {
    return res.fail({ used: usedSlots, total: totalSlots }, `No ${tier} slots available`, 403)
  }

  const [updated] = await db.update(vehicles).set({
    tier: tier as 'entry' | 'mid' | 'top',
    tierChangesRemaining: vehicle.tierChangesRemaining - 1,
    updatedAt: new Date(),
  }).where(eq(vehicles.id, vehicle.id)).returning()

  await db.insert(vehicleTierHistory).values({
    vehicleId: vehicle.id,
    fromTier: vehicle.tier,
    toTier: tier as 'entry' | 'mid' | 'top',
    changedBy: req.user!.userId,
  })

  return res.success(updated)
}))

router.post('/:id/cut', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  if (!vehicle.imei) return res.fail(null, 'Vehicle has no IMEI registered')

  const [state] = await db.select().from(vehicleState).where(eq(vehicleState.vehicleId, vehicle.id)).limit(1)
  if (!state) {
    return res.fail(null, 'No recent telemetry — cannot confirm vehicle is stationary', 409)
  }

  const ageMs = Date.now() - new Date(state.updatedAt).getTime()
  if (ageMs > 2 * 60 * 1000) {
    return res.fail({ ageMs }, 'Last telemetry too old to confirm current state', 409)
  }
  if ((state.speed || 0) > 1) {
    return res.fail({ speed: state.speed }, 'Vehicle is moving — cannot cut while in motion', 409)
  }

  await fetch(`${TCP_INTERNAL_URL}/internal/commands/${vehicle.imei}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cut' }),
  })
  await pollCommandStatus(vehicle.imei)

  await db.update(vehicles).set({ immobilised: true }).where(eq(vehicles.id, vehicle.id))
  await db.insert(vehicleImmobiliseHistory).values({
    vehicleId: vehicle.id,
    action: 'cut',
    triggeredBy: req.user!.userId,
  })

  return res.success(null, 'Cut command sent')
}))

router.post('/:id/restore', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, req.params.id), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  if (!vehicle.imei) return res.fail(null, 'Vehicle has no IMEI registered')

  await fetch(`${TCP_INTERNAL_URL}/internal/commands/${vehicle.imei}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restore' }),
  })
  await pollCommandStatus(vehicle.imei)

  await db.update(vehicles).set({ immobilised: false }).where(eq(vehicles.id, vehicle.id))
  await db.insert(vehicleImmobiliseHistory).values({
    vehicleId: vehicle.id,
    action: 'restore',
    triggeredBy: req.user!.userId,
  })

  return res.success(null, 'Restore command sent')
}))

export default router
