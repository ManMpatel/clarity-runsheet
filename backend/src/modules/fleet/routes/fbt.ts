// Ported from api/routes/fbt.js. Mongo native driver -> Drizzle/Postgres. `fbt_settings` now has
// a real unique constraint on companyId (was upserted by a natural {companyId} key in Mongo with
// no DB-level guarantee), so settings save uses Drizzle's onConflictDoUpdate. The manual-classify
// endpoint imports the canonical classifyTrip from modules/ingestion/fbt-classifier.ts (see that
// file's comment — the old worker/ and api/ deployables had DIVERGED copies of this classifier;
// this is now the single source of truth) instead of duplicating classification logic here: when
// no explicit classification is supplied in the request body, the trip is re-classified against
// current company settings rather than requiring the caller to always pass one.
import express from 'express'
import { and, desc, eq, gte, lte } from 'drizzle-orm'
import { db } from '../../../db/client'
import { trips, fbtSettings } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { classifyTrip } from '../../ingestion/fbt-classifier'

const router = express.Router()

function settingsResponse(companyId: string, settings?: typeof fbtSettings.$inferSelect | null) {
  if (!settings) {
    return {
      companyId,
      businessHours: { start: '07:00', end: '18:00' },
      businessDays: [1, 2, 3, 4, 5],
      mode: 'auto',
    }
  }
  return {
    companyId: settings.companyId,
    businessHours: { start: settings.businessHoursStart, end: settings.businessHoursEnd },
    businessDays: settings.businessDays,
    mode: settings.mode,
  }
}

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, from, to, classification } = req.query as Record<string, string>

  const conditions = [eq(trips.companyId, req.companyId!)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId))
  if (classification) conditions.push(eq(trips.classification, classification as 'business' | 'personal'))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from)))
    conditions.push(lte(trips.startTime, new Date(to)))
  }

  const list = await db.select().from(trips)
    .where(and(...conditions))
    .orderBy(desc(trips.startTime))

  return res.success(list)
}))

router.put('/:id/classify', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { classification, purpose } = req.body

  if (classification && !['business', 'personal'].includes(classification)) {
    return res.fail(null, 'classification must be business or personal')
  }

  const [trip] = await db.select().from(trips)
    .where(and(eq(trips.id, (req.params.id as string)), eq(trips.companyId, req.companyId!)))
    .limit(1)
  if (!trip) return res.fail(null, 'Trip not found', 404)

  let finalClassification: 'business' | 'personal' = classification
  if (!finalClassification) {
    const [settings] = await db.select().from(fbtSettings).where(eq(fbtSettings.companyId, req.companyId!)).limit(1)
    finalClassification = settings ? classifyTrip(trip.startTime, settings as any) : 'personal'
  }

  const [updated] = await db.update(trips).set({
    classification: finalClassification,
    purpose: purpose || null,
    classifiedAt: new Date(),
    classifiedBy: req.user!.userId,
    updatedAt: new Date(),
  }).where(and(eq(trips.id, (req.params.id as string)), eq(trips.companyId, req.companyId!))).returning()

  return res.success(updated)
}))

router.get('/summary', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { vehicleId, year } = req.query as Record<string, string>
  const startYear = parseInt(year) || new Date().getFullYear()
  const from = new Date(`${startYear}-04-01`)
  const to = new Date(`${startYear + 1}-03-31`)

  const conditions = [
    eq(trips.companyId, req.companyId!),
    gte(trips.startTime, from),
    lte(trips.startTime, to),
  ]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId))

  const list = await db.select().from(trips).where(and(...conditions))

  const summary = {
    totalTrips: list.length,
    businessTrips: list.filter((t) => t.classification === 'business').length,
    personalTrips: list.filter((t) => t.classification === 'personal').length,
    unclassifiedTrips: list.filter((t) => !t.classification).length,
    businessKm: list.filter((t) => t.classification === 'business')
      .reduce((sum, t) => sum + Number(t.distanceKm || 0), 0),
    personalKm: list.filter((t) => t.classification === 'personal')
      .reduce((sum, t) => sum + Number(t.distanceKm || 0), 0),
    financialYear: `${startYear}-${startYear + 1}`,
  }

  return res.success(summary)
}))

// GET /api/v1/fbt/settings
// Returns business hours setting for this company
router.get('/settings', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [settings] = await db.select().from(fbtSettings).where(eq(fbtSettings.companyId, req.companyId!)).limit(1)
  return res.success(settingsResponse(req.companyId!, settings))
}))

// PUT /api/v1/fbt/settings
// Contractor sets business hours once — all trips auto-classified from this point
// mode: 'auto' = classify by hours, 'all_business' = everything is business
router.put('/settings', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { businessHours, businessDays, mode } = req.body

  if (!businessHours?.start || !businessHours?.end) {
    return res.fail(null, 'businessHours.start and end required')
  }

  const [settings] = await db.insert(fbtSettings).values({
    companyId: req.companyId!,
    businessHoursStart: businessHours.start,
    businessHoursEnd: businessHours.end,
    businessDays: businessDays || [1, 2, 3, 4, 5],
    mode: mode || 'auto',
  }).onConflictDoUpdate({
    target: fbtSettings.companyId,
    set: {
      businessHoursStart: businessHours.start,
      businessHoursEnd: businessHours.end,
      businessDays: businessDays || [1, 2, 3, 4, 5],
      mode: mode || 'auto',
      updatedAt: new Date(),
    },
  }).returning()

  return res.success(settingsResponse(req.companyId!, settings))
}))

export default router
