// Ported from api/routes/drivers.js. Mongo native driver -> Drizzle/Postgres. The
// driver_history collection's "never deleted" append-only semantics are preserved as-is —
// see driver-history schema note in db/schema/drivers.ts.
import express from 'express'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../../../db/client'
import { drivers, driverHistory, safetyScores } from '../../../db/schema'
import { requireAuth, requireRole, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const list = await db.select().from(drivers)
    .where(eq(drivers.companyId, req.companyId!))
    .orderBy(drivers.name)
  return res.success(list)
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [driver] = await db.select().from(drivers)
    .where(and(eq(drivers.id, req.params.id), eq(drivers.companyId, req.companyId!)))
    .limit(1)
  if (!driver) return res.fail(null, 'Driver not found', 404)
  return res.success(driver)
}))

router.get('/:id/score', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const history = await db.select().from(safetyScores)
    .where(and(eq(safetyScores.driverId, req.params.id), eq(safetyScores.companyId, req.companyId!)))
    .orderBy(desc(safetyScores.weekStart))
    .limit(12)
  return res.success(history)
}))

// GET /api/v1/drivers/:id/history
// Permanent log of every vehicle assignment change — never deleted
router.get('/:id/history', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const history = await db.select().from(driverHistory)
    .where(and(eq(driverHistory.driverId, req.params.id), eq(driverHistory.companyId, req.companyId!)))
    .orderBy(desc(driverHistory.startedAt))
  return res.success(history)
}))

router.post('/', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, email, mobile, licenceNumber, licenceExpiry, vehicleId } = req.body
  if (!name || !mobile || !email) {
    return res.fail(null, 'Name, email and mobile required')
  }

  const [driver] = await db.insert(drivers).values({
    companyId: req.companyId!,
    name,
    email: email.toLowerCase(),
    mobile,
    licenceNumber: licenceNumber || null,
    licenceExpiry: licenceExpiry || null,
    vehicleId: vehicleId || null,
    active: true,
  }).returning()

  return res.success(driver, 'Driver created')
}))

router.put('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, email, mobile, licenceNumber, licenceExpiry, vehicleId, active } = req.body

  const [updated] = await db.update(drivers).set({
    name, email, mobile, licenceNumber,
    licenceExpiry: licenceExpiry || null,
    vehicleId, active, updatedAt: new Date(),
  }).where(and(eq(drivers.id, req.params.id), eq(drivers.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Driver not found', 404)
  return res.success(updated)
}))

// PUT /api/v1/drivers/:id/assign-vehicle
// Assigns driver to a van — logs permanent history record
// When driver changes, old record gets endedAt, new record created
router.put('/:id/assign-vehicle', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { vehicleId } = req.body
  const driverId = req.params.id

  const [driver] = await db.select().from(drivers)
    .where(and(eq(drivers.id, driverId), eq(drivers.companyId, req.companyId!)))
    .limit(1)
  if (!driver) return res.fail(null, 'Driver not found', 404)

  // Close off previous assignment if exists
  if (driver.vehicleId) {
    await db.update(driverHistory).set({ endedAt: new Date() })
      .where(and(
        eq(driverHistory.driverId, driverId),
        eq(driverHistory.vehicleId, driver.vehicleId),
        isNull(driverHistory.endedAt),
      ))
  }

  // Update driver record
  await db.update(drivers).set({ vehicleId: vehicleId || null, updatedAt: new Date() })
    .where(eq(drivers.id, driverId))

  // Create new history record if assigning to a vehicle
  if (vehicleId) {
    await db.insert(driverHistory).values({
      companyId: req.companyId!,
      driverId,
      vehicleId,
      driverName: driver.name,
      startedAt: new Date(),
      endedAt: null,
    })
  }

  return res.success({ driverId, vehicleId: vehicleId || null })
}))

export default router
