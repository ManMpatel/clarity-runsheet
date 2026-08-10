// Ported from api/routes/maintenance.js. Mongo native driver -> Drizzle/Postgres.
import express from 'express'
import { and, asc, eq, lte } from 'drizzle-orm'
import { db } from '../../../db/client'
import { maintenance } from '../../../db/schema'
import { requireAuth, requireRole, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { idempotent } from '../../../middleware/idempotency'

const router = express.Router()

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, status } = req.query as Record<string, string>

  const conditions = [eq(maintenance.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(maintenance.vehicleId, vehicleId))
  if (status) conditions.push(eq(maintenance.status, status as 'pending' | 'completed'))

  const records = await db.select().from(maintenance)
    .where(and(...conditions))
    .orderBy(asc(maintenance.dueDate))

  return res.success(records)
}))

router.post('/', requireAuth, requireCompany, requireRole('companyAdmin', 'fleetManager', 'superAdmin'), idempotent, asyncRoute(async (req, res) => {
  const { vehicleId, type, dueDate, dueOdometer, notes } = req.body
  if (!vehicleId || !type) {
    return res.fail(null, 'Vehicle and type required')
  }

  const [record] = await db.insert(maintenance).values({
    companyId: req.companyId!,
    vehicleId,
    type,
    dueDate: dueDate || null,
    dueOdometer: dueOdometer || null,
    notes: notes || null,
    status: 'pending',
  }).returning()

  return res.success(record, 'Maintenance record created')
}))

router.put('/:id/complete', requireAuth, requireCompany, requireRole('companyAdmin', 'fleetManager', 'superAdmin'), asyncRoute(async (req, res) => {
  const { completedDate, notes, nextDueDate, nextDueOdometer } = req.body

  const [updated] = await db.update(maintenance).set({
    status: 'completed',
    completedDate: completedDate || new Date().toISOString().slice(0, 10),
    completionNotes: notes || null,
    nextDueDate: nextDueDate || null,
    nextDueOdometer: nextDueOdometer || null,
    updatedAt: new Date(),
  }).where(and(eq(maintenance.id, (req.params.id as string)), eq(maintenance.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Record not found', 404)
  return res.success(updated)
}))

router.get('/due', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const due = await db.select().from(maintenance)
    .where(and(
      eq(maintenance.companyId, req.companyId!),
      eq(maintenance.status, 'pending'),
      lte(maintenance.dueDate, nextWeek),
    ))
    .orderBy(asc(maintenance.dueDate))

  return res.success(due)
}))

export default router
