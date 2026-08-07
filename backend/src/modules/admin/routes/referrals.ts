// Ported from api/routes/referrals.js. Straightforward Mongo-to-Postgres translation, plus the
// known accountType casing bug fix: the original queried `accountType: 'garageOwner'`
// (camelCase) against a value the admin route only ever wrote as 'garage_owner' (snake_case) —
// these never matched, so the garage-owner referral listing was silently always empty. Fixed to
// 'garage_owner' to match db/schema/companies.ts's accountTypeEnum.
import express from 'express'
import { eq, and, isNotNull, desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, devices, vehicles, settlements } from '../../../db/schema'
import { requireAuth, requireSuperAdmin } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

const TIER_RATES: Record<string, number> = { entry: 18, mid: 25, top: 45 }
const COMMISSION = 0.10

// GET /api/referrals/summary — garage owner sees their earnings
router.get('/summary', requireAuth, asyncRoute(async (req, res) => {
  const linked = await db.select().from(devices)
    .where(and(eq(devices.registeredByCompanyId, req.companyId!), isNotNull(devices.customerId)))

  const deviceDetails = await Promise.all(linked.map(async (d) => {
    const [vehicle] = await db.select().from(vehicles)
      .where(and(eq(vehicles.imei, d.imei), eq(vehicles.active, true))).limit(1)
    const tier = vehicle?.tier || 'entry'
    const monthly = TIER_RATES[tier] || 18
    return {
      imei: d.imei,
      deviceType: d.deviceType,
      tier,
      monthly,
      commission: +(monthly * COMMISSION).toFixed(2),
    }
  }))

  const monthlyTotal = deviceDetails.reduce((s, d) => s + d.commission, 0)

  const settledRows = await db.select().from(settlements).where(eq(settlements.garageCompanyId, req.companyId!))
  const totalEarned = settledRows.reduce((s, r) => s + r.amount, 0)

  return res.success({
    activeDevices: linked.length,
    monthlyCommission: +monthlyTotal.toFixed(2),
    totalEarned,
    devices: deviceDetails,
  })
}))

// GET /api/referrals/settlements — garage owner payout history
router.get('/settlements', requireAuth, asyncRoute(async (req, res) => {
  const list = await db.select().from(settlements)
    .where(eq(settlements.garageCompanyId, req.companyId!))
    .orderBy(desc(settlements.settledAt))
  return res.success(list)
}))

// GET /api/referrals/admin/all — super admin sees all garages
router.get('/admin/all', requireSuperAdmin, asyncRoute(async (req, res) => {
  const garages = await db.select().from(companies).where(eq(companies.accountType, 'garage_owner'))

  const result = await Promise.all(garages.map(async (g) => {
    const linked = await db.select().from(devices)
      .where(and(eq(devices.registeredByCompanyId, g.id), isNotNull(devices.customerId)))

    let monthly = 0
    for (const d of linked) {
      const [v] = await db.select().from(vehicles)
        .where(and(eq(vehicles.imei, d.imei), eq(vehicles.active, true))).limit(1)
      monthly += (TIER_RATES[v?.tier || 'entry'] || 18) * COMMISSION
    }

    const settledRows = await db.select().from(settlements).where(eq(settlements.garageCompanyId, g.id))
    const totalSettled = settledRows.reduce((s, r) => s + r.amount, 0)

    return {
      id: g.id,
      name: g.name,
      // NOTE: companies has no `email` column (never did — the original's `g.email` was always
      // undefined too, since nothing in admin.ts's company creation ever set one). Kept as null
      // to preserve the original response shape.
      email: null,
      activeDevices: linked.length,
      monthly: +monthly.toFixed(2),
      totalSettled,
    }
  }))

  return res.success(result)
}))

// POST /api/referrals/admin/:garageId/settle — record a payout
router.post('/admin/:garageId/settle', requireSuperAdmin, asyncRoute(async (req, res) => {
  const { amount, period, note } = req.body
  if (!amount || !period) {
    return res.fail(null, 'Amount and period required')
  }

  // settlements.amount is an integer column (whole cents/dollars, per schema) — round the
  // incoming float rather than truncate via a raw Postgres type-cast error.
  const [record] = await db.insert(settlements).values({
    garageCompanyId: req.params.garageId,
    amount: Math.round(parseFloat(amount)),
    period,
    note: note || '',
  }).returning()

  return res.success({ record }, 'Settlement recorded')
}))

export default router
