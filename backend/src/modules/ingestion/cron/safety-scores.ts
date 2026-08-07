// Ported from worker/cron/safety-scores.js. Mongo aggregation-by-hand (find + JS .filter)
// replaced with Drizzle queries — the original logic did the same thing in application code
// rather than a real Mongo aggregation pipeline, so this is a straightforward query-syntax port.
import cron from 'node-cron'
import { eq, and, gte, lte } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, drivers, driverEvents, safetyScores } from '../../../db/schema'

export function startSafetyScoreCron() {
  cron.schedule('0 0 * * 0', async () => {
    console.log('[Cron] Running weekly safety score calculation')
    try {
      await calculateAllScores()
    } catch (err: any) {
      console.error('[Cron] Safety score error:', err.message)
    }
  })
  console.log('[Cron] Safety score job scheduled — runs Sunday midnight')
}

async function calculateAllScores() {
  const allCompanies = await db.select().from(companies).where(eq(companies.active, true))
  for (const company of allCompanies) {
    await calculateCompanyScores(company.id)
  }
}

async function calculateCompanyScores(companyId: string) {
  const companyDrivers = await db.select().from(drivers).where(and(eq(drivers.companyId, companyId), eq(drivers.active, true)))
  for (const driver of companyDrivers) {
    await calculateDriverScore(companyId, driver)
  }
}

async function calculateDriverScore(companyId: string, driver: any) {
  const weekStart = getLastMonday()
  const weekEnd = new Date()

  if (!driver.vehicleId) return

  const events = await db.select().from(driverEvents).where(and(
    eq(driverEvents.companyId, companyId),
    eq(driverEvents.vehicleId, driver.vehicleId),
    gte(driverEvents.timestamp, weekStart),
    lte(driverEvents.timestamp, weekEnd),
  ))

  const harshBraking = events.filter((e) => e.type === 'harshBraking').length
  const harshAccel = events.filter((e) => e.type === 'harshAcceleration').length
  const harshCornering = events.filter((e) => e.type === 'harshCornering').length
  const speedingEvents = events.filter((e) => e.type === 'speeding').length

  const brakingScore = Math.max(0, 100 - harshBraking * 5)
  const accelScore = Math.max(0, 100 - harshAccel * 5)
  const corneringScore = Math.max(0, 100 - harshCornering * 5)
  const speedingScore = Math.max(0, 100 - speedingEvents * 10)
  const overallScore = Math.round((brakingScore + accelScore + corneringScore + speedingScore) / 4)

  await db.insert(safetyScores).values({
    companyId,
    driverId: driver.id,
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    brakingScore: String(brakingScore),
    accelScore: String(accelScore),
    corneringScore: String(corneringScore),
    speedingScore: String(speedingScore),
    overallScore: String(overallScore),
    eventCount: events.length,
  })

  console.log(`[Cron] Score for ${driver.name}: ${overallScore}`)
}

function getLastMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}
