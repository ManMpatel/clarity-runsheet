// Ported from api/routes/alerts.js. Mongo native driver -> Drizzle/Postgres. `alert_rules` now
// has a real unique constraint on (companyId, type) — was upserted by that natural key in Mongo
// with no DB-level guarantee — so the preferences save uses Drizzle's onConflictDoUpdate.
import express from 'express'
import { and, desc, eq, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { alerts, alertRules } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { type, severity, read, page = '1', limit = '20' } = req.query as Record<string, string>

  const conditions = [eq(alerts.companyId, req.companyId!)]
  if (type) conditions.push(eq(alerts.type, type as any))
  if (severity) conditions.push(eq(alerts.severity, severity as any))
  if (read !== undefined) conditions.push(eq(alerts.read, read === 'true'))

  const pageNum = parseInt(page)
  const limitNum = parseInt(limit)

  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(alerts).where(and(...conditions))

  const list = await db.select().from(alerts)
    .where(and(...conditions))
    .orderBy(desc(alerts.createdAt))
    .offset((pageNum - 1) * limitNum)
    .limit(limitNum)

  const [{ count: unread }] = await db.select({ count: sql<number>`count(*)::int` }).from(alerts)
    .where(and(eq(alerts.companyId, req.companyId!), eq(alerts.read, false)))

  return res.success({ alerts: list, total, unread, page: pageNum })
}))

router.put('/:id/read', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  await db.update(alerts).set({ read: true, readAt: new Date() })
    .where(and(eq(alerts.id, req.params.id), eq(alerts.companyId, req.companyId!)))
  return res.success({ success: true })
}))

router.put('/read-all', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  await db.update(alerts).set({ read: true, readAt: new Date() })
    .where(and(eq(alerts.companyId, req.companyId!), eq(alerts.read, false)))
  return res.success({ success: true })
}))

// GET /api/v1/alerts/preferences
router.get('/preferences', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const rules = await db.select().from(alertRules).where(eq(alertRules.companyId, req.companyId!))
  return res.success(rules)
}))

// POST /api/v1/alerts/preferences
router.post('/preferences', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { speeding, afterHours, speedLimit, voltageThreshold, smsNumber } = req.body

  const rules: Array<{ type: 'speeding' | 'afterHours' | 'engineFault' | 'lowBattery' | 'towing', active: boolean, speedLimit?: number, voltageThreshold?: number }> = [
    { type: 'speeding', active: !!speeding, speedLimit: speedLimit || 110 },
    { type: 'afterHours', active: !!afterHours },
    { type: 'engineFault', active: true },
    { type: 'lowBattery', active: true, voltageThreshold: voltageThreshold || 11.5 },
    { type: 'towing', active: true },
  ]

  for (const rule of rules) {
    await db.insert(alertRules).values({
      companyId: req.companyId!,
      type: rule.type,
      active: rule.active,
      speedLimit: rule.speedLimit,
      voltageThreshold: rule.voltageThreshold?.toString(),
      smsNumber: smsNumber || null,
    }).onConflictDoUpdate({
      target: [alertRules.companyId, alertRules.type],
      set: {
        active: rule.active,
        speedLimit: rule.speedLimit,
        voltageThreshold: rule.voltageThreshold?.toString(),
        smsNumber: smsNumber || null,
        updatedAt: new Date(),
      },
    })
  }

  return res.success({ success: true })
}))

export default router
