// Ported from api/routes/admin.js. Straightforward Mongo-to-Postgres translation — all routes
// here are true super-admin (cross-tenant) routes and are intentionally NOT scoped by
// req.companyId, same as the original. Two bugs fixed per migration review:
//   1. The original defined `GET /devices` twice (identical bodies) — deduped to one handler.
//   2. (see referrals.ts) accountType casing — this file's /account-type endpoint already
//      validated the correct snake_case values, so nothing changed here for that bug.
import express from 'express'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, users, vehicles, devices, upgradeRequests } from '../../../db/schema'
import { requireSuperAdmin } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { hashPassword } from '../../auth/services/passwords'

const router = express.Router()

router.get('/companies', requireSuperAdmin, asyncRoute(async (req, res) => {
  const allCompanies = await db.select().from(companies).orderBy(desc(companies.createdAt))

  const enriched = await Promise.all(allCompanies.map(async (c) => {
    const [admin] = await db.select().from(users)
      .where(and(eq(users.companyId, c.id), eq(users.role, 'companyAdmin'))).limit(1)
    return { ...c, adminEmail: admin?.email || null, adminName: admin?.name || null }
  }))

  return res.success(enriched)
}))

router.post('/companies', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { name, slug, adminName, adminEmail, adminPassword, subscriptionTier } = req.body
  if (!name || !slug || !adminEmail || !adminPassword) {
    return res.fail(null, 'All fields required')
  }

  const [existing] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
  if (existing) return res.fail(null, 'Slug already exists', 409)

  const [company] = await db.insert(companies).values({
    name,
    slug,
    subscriptionTier: subscriptionTier || 'entry',
    active: true,
  }).returning()

  const passwordHash = await hashPassword(adminPassword)
  await db.insert(users).values({
    companyId: company.id,
    name: adminName || adminEmail,
    email: adminEmail.toLowerCase(),
    passwordHash,
    role: 'companyAdmin',
    subscriptionTier: subscriptionTier || 'entry',
  })

  return res.success({ company }, 'Company created')
}))

router.put('/companies/:id/tier', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { subscriptionTier } = req.body
  await db.update(companies).set({ subscriptionTier, updatedAt: new Date() })
    .where(eq(companies.id, (req.params.id as string)))
  return res.success({ success: true })
}))

router.get('/companies/:id/slots', requireSuperAdmin, asyncRoute(async (req, res) => {
  const [company] = await db.select().from(companies).where(eq(companies.id, (req.params.id as string))).limit(1)
  if (!company) return res.fail(null, 'Company not found', 404)

  const entryUsed = (await db.select().from(vehicles)
    .where(and(eq(vehicles.companyId, (req.params.id as string)), eq(vehicles.tier, 'entry'), eq(vehicles.active, true)))).length
  const midUsed = (await db.select().from(vehicles)
    .where(and(eq(vehicles.companyId, (req.params.id as string)), eq(vehicles.tier, 'mid'), eq(vehicles.active, true)))).length
  const topUsed = (await db.select().from(vehicles)
    .where(and(eq(vehicles.companyId, (req.params.id as string)), eq(vehicles.tier, 'top'), eq(vehicles.active, true)))).length

  return res.success({
    company,
    slots: { entrySlots: company.entrySlots, midSlots: company.midSlots, topSlots: company.topSlots },
    used: { entry: entryUsed, mid: midUsed, top: topUsed },
  })
}))

router.put('/companies/:id/slots', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { entrySlots, midSlots, topSlots } = req.body

  const [updated] = await db.update(companies).set({
    entrySlots: parseInt(entrySlots, 10) || 0,
    midSlots: parseInt(midSlots, 10) || 0,
    topSlots: parseInt(topSlots, 10) || 0,
    updatedAt: new Date(),
  }).where(eq(companies.id, (req.params.id as string))).returning()

  const highestTier = parseInt(topSlots, 10) > 0 ? 'top'
    : parseInt(midSlots, 10) > 0 ? 'mid'
    : parseInt(entrySlots, 10) > 0 ? 'entry' : 'locked'
  await db.update(companies).set({ subscriptionTier: highestTier }).where(eq(companies.id, (req.params.id as string)))

  return res.success(updated)
}))

router.put('/companies/:id/account-type', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { accountType } = req.body
  if (!['individual', 'contractor', 'garage_owner'].includes(accountType)) {
    return res.fail(null, 'Invalid account type')
  }
  await db.update(companies).set({ accountType, updatedAt: new Date() }).where(eq(companies.id, (req.params.id as string)))
  return res.success({ success: true })
}))

router.put('/companies/:id/revoke', requireSuperAdmin, asyncRoute(async (req, res) => {
  await db.update(companies).set({ active: false, updatedAt: new Date() }).where(eq(companies.id, (req.params.id as string)))
  return res.success({ success: true })
}))

router.delete('/companies/:id', requireSuperAdmin, asyncRoute(async (req, res) => {
  const id = (req.params.id as string)
  // Delete children before the parent — Postgres enforces the company_id FK (Mongo did not),
  // so this ordering is required for the delete to succeed at all. Note: other tables that
  // reference this company (drivers, trips, devices, settlements, safety_scores,
  // upgrade_requests) are — same as the original Mongo code — NOT cleaned up here, which can
  // still cause the final company delete to fail with a foreign key violation. Flagged, not
  // fixed, per instructions to preserve business logic as-is.
  await db.delete(vehicles).where(eq(vehicles.companyId, id))
  await db.delete(users).where(eq(users.companyId, id))
  await db.delete(companies).where(eq(companies.id, id))
  return res.success({ success: true })
}))

router.get('/upgrade-requests', requireSuperAdmin, asyncRoute(async (req, res) => {
  const requests = await db.select().from(upgradeRequests).orderBy(desc(upgradeRequests.createdAt))
  return res.success(requests)
}))

router.put('/upgrade-requests/:id/action', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { action } = req.body
  const [updated] = await db.update(upgradeRequests).set({ status: action, actionedAt: new Date() })
    .where(eq(upgradeRequests.id, (req.params.id as string))).returning()
  return res.success(updated)
}))

router.put('/companies/:id/set-role', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { role } = req.body
  // NOTE: 'contractor'/'garageOwner' — legacy camelCase, deliberately unchanged. This is
  // `companies.role`, a distinct free-text column from `companies.accountType`; nothing else
  // reads it in a way that would break from the casing mismatch with accountType. See schema
  // comment in db/schema/companies.ts.
  if (!['contractor', 'garageOwner'].includes(role)) {
    return res.fail(null, 'Invalid role')
  }
  await db.update(companies).set({ role, updatedAt: new Date() }).where(eq(companies.id, (req.params.id as string)))
  return res.success({ success: true })
}))

// NOTE: the original file defined this route twice (identical bodies) — deduped to one handler.
router.get('/devices', requireSuperAdmin, asyncRoute(async (req, res) => {
  const list = await db.select().from(devices).orderBy(desc(devices.registeredAt))
  return res.success(list)
}))

router.get('/companies/:id/devices', requireSuperAdmin, asyncRoute(async (req, res) => {
  const list = await db.select().from(devices)
    .where(eq(devices.registeredByCompanyId, (req.params.id as string)))
    .orderBy(desc(devices.registeredAt))
  return res.success(list)
}))

router.get('/companies/:id/vehicles', requireSuperAdmin, asyncRoute(async (req, res) => {
  const list = await db.select().from(vehicles)
    .where(and(eq(vehicles.companyId, (req.params.id as string)), eq(vehicles.active, true)))
    .orderBy(desc(vehicles.createdAt))
  return res.success(list)
}))

router.get('/companies/:id/users', requireSuperAdmin, asyncRoute(async (req, res) => {
  const list = await db.select().from(users)
    .where(eq(users.companyId, (req.params.id as string)))
    .orderBy(desc(users.createdAt))
  const safe = list.map(({ passwordHash, ...rest }) => rest)
  return res.success(safe)
}))

// Device connectivity diagnostics. The tcp-listener's per-IMEI counters (metrics/usage.ts) live
// on its internal HTTP server on port 4001, which docker-compose.prod.yml binds to 127.0.0.1 and
// DEPLOY.md's ufw rules keep off the public interface — so it's unreachable from a browser without
// an SSH tunnel. This proxies it behind the existing super-admin guard, reusing the same
// TCP_INTERNAL_URL hop that fleet/routes/vehicles.ts already uses for relay cut/restore.
//
// Answers, for a device that "should be tracking but isn't":
//   connected[]           — is the device attached to the listener AT ALL right now?
//   devices[imei].bytes   — is it sending, and how much against the ~273 KB/day SIM budget?
//   devices[imei].crcFailures — is it sending corrupt frames (which burn data on retransmit)?
const TCP_INTERNAL_URL = process.env.TCP_INTERNAL_URL || 'http://localhost:4001'

router.get('/device-metrics', requireSuperAdmin, asyncRoute(async (req, res) => {
  try {
    // The tcp-listener is a separate container/process; if it's down this fetch rejects rather
    // than returning a status, so a plain 502 is more honest than letting it 500 as an unhandled
    // error — "listener unreachable" is itself the diagnostic answer.
    const upstream = await fetch(`${TCP_INTERNAL_URL}/internal/metrics`)
    if (!upstream.ok) {
      return res.fail({ upstreamStatus: upstream.status }, 'tcp-listener metrics unavailable', 502)
    }
    return res.success(await upstream.json())
  } catch (err: any) {
    return res.fail({ reason: err.message }, 'tcp-listener unreachable', 502)
  }
}))

router.put('/companies/:id/billing', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { billingMode, customPrice } = req.body
  if (!['stripe', 'becs', 'manual'].includes(billingMode)) {
    return res.fail(null, 'Invalid billing mode')
  }
  await db.update(companies).set({
    billingMode,
    customPrice: customPrice != null ? String(parseFloat(customPrice)) : null,
    updatedAt: new Date(),
  }).where(eq(companies.id, (req.params.id as string)))
  return res.success({ success: true })
}))

export default router
