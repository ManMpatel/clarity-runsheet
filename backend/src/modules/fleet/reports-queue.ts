// Replaces api/services/reports-queue.js's console.log stub. No new job-queue library — per the
// migration spec, Redis-dependent features (BullMQ etc.) are explicitly out of scope. Report
// generation runs asynchronously via `setImmediate` in the same process, backed by the new
// `report_jobs` table (see db/schema/misc.ts) instead of an in-memory/console stub: a row is
// inserted as 'pending' immediately, flipped to 'running' when generation starts, and to
// 'done'/'failed' with resultUrl/error/completedAt when it finishes.
//
// GAP (flagged for the user): there's no blob/file storage service wired up anywhere else in
// this migration (no S3 client). Report output is written as JSON to a local
// backend/storage/reports/ directory. This works for a single-instance deployment but won't
// survive a restart/redeploy or work across multiple API instances.
//
// `resultUrl` is an authenticated API path (`GET /api/v1/reports/:id/download`, see
// routes/reports-async.ts), not a static file path — the directory used to be served directly
// via `express.static` with no auth check at all, which let anyone who guessed/observed a job's
// UUID download another tenant's report. The download route re-checks req.companyId against the
// job's companyId before streaming the file.
import fs from 'fs'
import path from 'path'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '../../db/client'
import { reportJobs, safetyScores, telemetry, trips, vehicles, vehicleState } from '../../db/schema'

export const REPORTS_DIR = path.join(__dirname, '..', '..', '..', 'storage', 'reports')

function ensureReportsDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true })
}

export async function queueReport(type: string, companyId: string, params: Record<string, any> = {}) {
  const [job] = await db.insert(reportJobs).values({
    companyId,
    type,
    status: 'pending',
  }).returning()

  // Fire-and-forget — the caller gets the job id back immediately and polls for completion.
  setImmediate(() => {
    runReport(job.id, type, companyId, params).catch((err) => {
      console.error(`[Reports] Unhandled error running report ${job.id}:`, err.message)
    })
  })

  return job
}

async function runReport(jobId: string, type: string, companyId: string, params: Record<string, any>) {
  await db.update(reportJobs).set({ status: 'running' }).where(eq(reportJobs.id, jobId))

  try {
    const data = await generateReport(type, companyId, params)

    ensureReportsDir()
    const filename = `${type}-${jobId}.json`
    fs.writeFileSync(path.join(REPORTS_DIR, filename), JSON.stringify(data))

    await db.update(reportJobs).set({
      status: 'done',
      resultUrl: `/api/v1/reports/${jobId}/download`,
      completedAt: new Date(),
    }).where(eq(reportJobs.id, jobId))
  } catch (err: any) {
    console.error(`[Reports] ${type} generation failed for job ${jobId}:`, err.message)
    await db.update(reportJobs).set({
      status: 'failed',
      error: err.message || 'Report generation failed',
      completedAt: new Date(),
    }).where(eq(reportJobs.id, jobId))
  }
}

async function generateReport(type: string, companyId: string, params: Record<string, any>) {
  switch (type) {
    case 'driver-scores': return generateDriverScores(companyId, params)
    case 'fuel-idle': return generateFuelIdle(companyId, params)
    case 'trip-summary': return generateTripSummary(companyId, params)
    case 'vehicle-health': return generateVehicleHealth(companyId)
    default: throw new Error(`Unknown report type: ${type}`)
  }
}

async function generateDriverScores(companyId: string, params: Record<string, any>) {
  const { from, to } = params
  const conditions = [eq(safetyScores.companyId, companyId)]
  if (from && to) {
    conditions.push(gte(safetyScores.weekStart, from))
    conditions.push(lte(safetyScores.weekStart, to))
  }
  return db.select().from(safetyScores).where(and(...conditions)).orderBy(safetyScores.weekStart)
}

async function generateFuelIdle(companyId: string, params: Record<string, any>) {
  const { vehicleId, from, to } = params
  if (!from || !to) throw new Error('from and to required for fuel-idle report')

  const conditions = [
    eq(telemetry.companyId, companyId),
    gte(telemetry.time, new Date(from)),
    lte(telemetry.time, new Date(to)),
  ]
  if (vehicleId) conditions.push(eq(telemetry.vehicleId, vehicleId))

  const records = await db.select({
    time: telemetry.time,
    vehicleId: telemetry.vehicleId,
    speed: telemetry.speed,
    fuelLevel: telemetry.fuelLevel,
  }).from(telemetry).where(and(...conditions))

  const idleRecords = records.filter((r) => r.speed === 0 && r.fuelLevel !== null)
  return { total: records.length, idleCount: idleRecords.length, records: idleRecords }
}

async function generateTripSummary(companyId: string, params: Record<string, any>) {
  const { vehicleId, from, to } = params
  const conditions = [eq(trips.companyId, companyId)]
  if (vehicleId) conditions.push(eq(trips.vehicleId, vehicleId))
  if (from && to) {
    conditions.push(gte(trips.startTime, new Date(from)))
    conditions.push(lte(trips.startTime, new Date(to)))
  }

  const list = await db.select().from(trips).where(and(...conditions))

  const totalKm = list.reduce((s, t) => s + Number(t.distanceKm || 0), 0)
  const summary = {
    totalTrips: list.length,
    totalKm,
    totalDuration: list.reduce((s, t) => s + (t.durationMinutes || 0), 0),
    avgKmPerTrip: list.length ? Number((totalKm / list.length).toFixed(1)) : 0,
  }

  return { summary, trips: list }
}

async function generateVehicleHealth(companyId: string) {
  const fleet = await db.select().from(vehicles).where(eq(vehicles.companyId, companyId))

  return Promise.all(fleet.map(async (v) => {
    const [state] = await db.select().from(vehicleState).where(eq(vehicleState.vehicleId, v.id)).limit(1)
    return { vehicle: v, latest: state || null }
  }))
}
