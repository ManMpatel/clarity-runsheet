// Canonical FBT trip classifier — single source of truth, imported by BOTH ingestion's
// trip-builder AND the fleet API's fbt/trips routes. Fixes a production bug: the old
// worker/processors/trip-builder.js did `require('../services/fbt-classifier')`, which — because
// worker/ and api/ were separate deployables with separate node_modules — resolved to a
// *different*, divergent worker/services/fbt-classifier.js that only exported `classifyTrip`
// (different signature, different defaults: 'all_personal' mode, hardcoded 08:00-17:00 fallback,
// inclusive `<=` end-time) and never exported `autoClassifyTrip` at all. Every completed trip
// threw `TypeError: autoClassifyTrip is not a function`, uncaught. Kept api's implementation as
// canonical (it's the one actually reachable/tested via routes): requires explicit
// businessHours.start/end (no silent fallback), exclusive `<` end-time comparison.
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { fbtSettings, trips } from '../../db/schema'

interface FbtSettingsRow {
  mode: 'auto' | 'all_business' | 'all_personal'
  businessDays: number[] | null
  businessHoursStart: string | null
  businessHoursEnd: string | null
}

export function classifyTrip(startTime: Date, settings: FbtSettingsRow): 'business' | 'personal' {
  const date = new Date(startTime)
  const dayOfWeek = date.getDay() // 0 = Sunday ... 6 = Saturday

  const businessDays = settings.businessDays ?? [1, 2, 3, 4, 5]
  if (!businessDays.includes(dayOfWeek)) return 'personal'

  const tripMinutes = date.getHours() * 60 + date.getMinutes()

  const [startH, startM] = (settings.businessHoursStart ?? '08:00').split(':').map(Number)
  const [endH, endM] = (settings.businessHoursEnd ?? '17:00').split(':').map(Number)
  const businessStart = startH * 60 + startM
  const businessEnd = endH * 60 + endM

  if (tripMinutes >= businessStart && tripMinutes < businessEnd) return 'business'
  return 'personal'
}

// Called from trip-builder when a trip ends. Looks up company FBT settings and auto-classifies.
export async function autoClassifyTrip(tripId: string, companyId: string, startTime: Date) {
  try {
    const [settings] = await db.select().from(fbtSettings).where(eq(fbtSettings.companyId, companyId)).limit(1)

    // No settings saved yet — leave as unclassified.
    if (!settings) return null

    if (settings.mode === 'all_business') {
      await updateTripClassification(tripId, 'business')
      return 'business'
    }
    if (settings.mode === 'all_personal') {
      await updateTripClassification(tripId, 'personal')
      return 'personal'
    }

    const classification = classifyTrip(startTime, settings as unknown as FbtSettingsRow)
    await updateTripClassification(tripId, classification)
    return classification
  } catch (err: any) {
    console.error('[FBT] Auto classify error:', err.message)
    return null
  }
}

async function updateTripClassification(tripId: string, classification: 'business' | 'personal') {
  await db.update(trips).set({
    classification,
    classifiedBy: 'auto',
    classifiedAt: new Date(),
  }).where(eq(trips.id, tripId))
}
