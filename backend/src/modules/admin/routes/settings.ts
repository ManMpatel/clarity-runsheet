// Ported from api/routes/settings.js. Straightforward Mongo-to-Postgres translation. The old
// `PUT /push-token` route (stored a token on users.pushToken) has been REMOVED — it's superseded
// by the new dedicated `POST /api/v1/notifications/register-device` endpoint, which writes to
// the new device_tokens table instead. Keeping both would leave two competing mechanisms for the
// same thing.
import express from 'express'
import { eq, and } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, users } from '../../../db/schema'
import { requireAuth, requireCompany, requireRole } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { hashPassword } from '../../auth/services/passwords'

const router = express.Router()

router.get('/company', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [company] = await db.select().from(companies).where(eq(companies.id, req.companyId!)).limit(1)
  if (!company) return res.fail(null, 'Company not found', 404)
  const { stripeCustomerId, ...safe } = company
  return res.success(safe)
}))

router.put('/company', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, phone, address, timezone, abn, website } = req.body

  const [updated] = await db.update(companies).set({
    name, phone, address, timezone, abn, website, updatedAt: new Date(),
  }).where(eq(companies.id, req.companyId!)).returning()

  return res.success(updated)
}))

router.get('/users', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const list = await db.select().from(users).where(eq(users.companyId, req.companyId!))
  const safe = list.map(({ passwordHash, ...rest }) => rest)
  return res.success(safe)
}))

router.post('/users', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body
  if (!name || !email || !password || !role) {
    return res.fail(null, 'All fields required')
  }

  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  if (existing) return res.fail(null, 'Email already exists', 409)

  const passwordHash = await hashPassword(password)
  const [user] = await db.insert(users).values({
    companyId: req.companyId!,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role,
    subscriptionTier: 'entry',
  }).returning()

  const { passwordHash: _, ...safeUser } = user
  return res.success(safeUser, 'User created')
}))

router.put('/users/:id/role', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const { role } = req.body

  const [updated] = await db.update(users).set({ role, updatedAt: new Date() })
    .where(and(eq(users.id, (req.params.id as string)), eq(users.companyId, req.companyId!)))
    .returning()

  if (!updated) return res.fail(null, 'User not found', 404)
  const { passwordHash, ...safe } = updated
  return res.success(safe)
}))

// PUT /api/settings/onboarding-complete
// Called when user finishes or skips the onboarding wizard
// Sets flag on company record so wizard never shows again
router.put('/onboarding-complete', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  await db.update(companies).set({ onboardingComplete: true, updatedAt: new Date() })
    .where(eq(companies.id, req.companyId!))
  return res.success({ success: true })
}))

export default router
