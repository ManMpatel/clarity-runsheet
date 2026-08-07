// Ported from api/routes/upgrade.js. Straightforward Mongo-to-Postgres translation, no logic
// change.
import express from 'express'
import { eq, desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, upgradeRequests } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { sendUpgradeNotification } from '../../notifications/email'

const router = express.Router()

router.post('/request', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { entrySlots, midSlots, topSlots, message } = req.body

  const [company] = await db.select().from(companies).where(eq(companies.id, req.companyId!)).limit(1)

  const [request] = await db.insert(upgradeRequests).values({
    companyId: req.companyId!,
    companyName: company?.name || req.companyId!,
    requestedBy: (req.user!.userId as string),
    entrySlots: parseInt(entrySlots, 10) || 0,
    midSlots: parseInt(midSlots, 10) || 0,
    topSlots: parseInt(topSlots, 10) || 0,
    message: message || '',
    status: 'pending',
  }).returning()

  await sendUpgradeNotification(request)
  return res.success(request, 'Upgrade request submitted')
}))

router.get('/my-requests', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const requests = await db.select().from(upgradeRequests)
    .where(eq(upgradeRequests.companyId, req.companyId!))
    .orderBy(desc(upgradeRequests.createdAt))
  return res.success(requests)
}))

export default router
