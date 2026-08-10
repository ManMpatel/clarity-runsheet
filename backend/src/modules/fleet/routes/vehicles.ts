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
import { idempotent } from '../../../middleware/idempotency'

const router = express.Router()

const TCP_INTERNAL_URL = process.env.TCP_INTERNAL_URL || 'http://localhost:4001'

// PREVIOUSLY: this route awaited a 2s-interval/30-attempt poll loop (up to 60s) against the
// tcp-listener's internal command server before responding at all — so `POST /:id/cut` could
// hang for a full minute. The internal server itself already responds 202 the instant it hands
// the packet to the device socket (see tcp-listener/queue/commands.ts's `sendCommand`); the poll
// loop's only job was to wait for the device's async ack before this route replied. Mobile's
// axios timeout is 10s (frontend/mobile/src/lib/api.js), so that 60s wait made every immobiliser
// command *appear* to fail on mobile even when it eventually succeeded.
//
// Fixed by returning 202 immediately once the command is handed off, and exposing
// GET /:id/command-status for the client to poll — same total wait, but the client controls its
// own timeout/cancel/retry UI instead of the connection just hanging.
async function checkCommandStatus(imei: string) {
  const res = await fetch(`${TCP_INTERNAL_URL}/internal/commands/${imei}/status`)
  return res.json() as Promise<{ status: 'pending' | 'acked' | 'timeout' | 'unknown', command?: 'cut' | 'restore' }>
}

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const fleet = await db.select().from(vehicles)
    .where(eq(vehicles.companyId, req.companyId!))
    .orderBy(vehicles.name)
  return res.success(fleet)
}))

router.get('/status', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  // Was one query per vehicle — see the matching fix + comment on GET /telemetry/live above.
  const rows = await db.select({ id: vehicles.id, updatedAt: vehicleState.updatedAt }).from(vehicles)
    .leftJoin(vehicleState, eq(vehicleState.vehicleId, vehicles.id))
    .where(eq(vehicles.companyId, req.companyId!))

  const status = rows.map(({ id, updatedAt }) => {
    const lastSeen = updatedAt || null
    const ageMs = lastSeen ? Date.now() - new Date(lastSeen).getTime() : null

    let vState = 'offline'
    if (ageMs !== null) {
      if (ageMs < 2 * 60 * 1000) vState = 'online'
      else if (ageMs < 15 * 60 * 1000) vState = 'idle'
    }

    return { vehicleId: id, lastSeen, state: vState }
  })

  return res.success(status)
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  return res.success(vehicle)
}))

router.post('/', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), idempotent, asyncRoute(async (req, res) => {
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
  }).where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Vehicle not found', 404)
  return res.success(updated)
}))

router.delete('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [updated] = await db.update(vehicles).set({ active: false, updatedAt: new Date() })
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Vehicle not found', 404)
  return res.success({ success: true })
}))

router.put('/:id/tier', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { tier } = req.body
  if (!['entry', 'mid', 'top'].includes(tier)) {
    return res.fail(null, 'Invalid tier')
  }

  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!)))
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
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!)))
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

  const relay = await fetch(`${TCP_INTERNAL_URL}/internal/commands/${vehicle.imei}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cut' }),
  })
  if (relay.status === 409) {
    return res.fail(null, 'Device is not currently connected', 409)
  }

  // Recorded as the command being *issued*, not confirmed — `vehicles.immobilised` only flips
  // once the client polls /:id/command-status and the device has actually acked.
  await db.insert(vehicleImmobiliseHistory).values({
    vehicleId: vehicle.id,
    action: 'cut',
    triggeredBy: req.user!.userId,
  })

  return res.status(202).success({ commandId: vehicle.imei }, 'Cut command sent')
}))

router.get('/:id/command-status', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  if (!vehicle.imei) return res.fail(null, 'Vehicle has no IMEI registered')

  const status = await checkCommandStatus(vehicle.imei)

  if (status.status === 'acked' && status.command) {
    const immobilised = status.command === 'cut'
    // Idempotent — a client that polls repeatedly after the ack shouldn't write on every poll.
    if (vehicle.immobilised !== immobilised) {
      await db.update(vehicles).set({ immobilised }).where(eq(vehicles.id, vehicle.id))
    }
    return res.success({ status: status.status, immobilised })
  }

  return res.success({ status: status.status, immobilised: vehicle.immobilised })
}))

router.post('/:id/restore', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [vehicle] = await db.select().from(vehicles)
    .where(and(eq(vehicles.id, (req.params.id as string)), eq(vehicles.companyId, req.companyId!)))
    .limit(1)
  if (!vehicle) return res.fail(null, 'Vehicle not found', 404)
  if (!vehicle.imei) return res.fail(null, 'Vehicle has no IMEI registered')

  const relay = await fetch(`${TCP_INTERNAL_URL}/internal/commands/${vehicle.imei}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'restore' }),
  })
  if (relay.status === 409) {
    return res.fail(null, 'Device is not currently connected', 409)
  }

  await db.insert(vehicleImmobiliseHistory).values({
    vehicleId: vehicle.id,
    action: 'restore',
    triggeredBy: req.user!.userId,
  })

  return res.status(202).success({ commandId: vehicle.imei }, 'Restore command sent')
}))

export default router
