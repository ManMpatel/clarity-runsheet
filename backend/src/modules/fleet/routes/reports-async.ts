// NEW — Phase 4 async report generation. Mounted at /api/v1/reports alongside
// admin/routes/reports.ts's existing fast-query router (POST / + GET /:id here, GET /driver-scores
// etc. there — see entrypoints/api.ts). Backed by reports-queue.ts's queueReport(), which now
// writes to the real `report_jobs` table instead of the old console.log stub.
import express from 'express'
import fs from 'fs'
import path from 'path'
import { and, eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { reportJobs } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { queueReport, REPORTS_DIR } from '../reports-queue'

const router = express.Router()

router.post('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { type, params } = req.body
  if (!type) return res.fail(null, 'Report type required')

  const report = await queueReport(type, req.companyId!, params || {})
  return res.success({ jobId: report.id }, 'Report queued')
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [job] = await db.select().from(reportJobs)
    .where(and(eq(reportJobs.id, (req.params.id as string)), eq(reportJobs.companyId, req.companyId!)))
    .limit(1)
  if (!job) return res.fail(null, 'Report job not found', 404)

  return res.success({
    id: job.id,
    type: job.type,
    status: job.status,
    resultUrl: job.resultUrl,
    error: job.error,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
  })
}))

// Replaces the old unauthenticated `express.static('/storage/reports')` mount (api.ts) — that
// served any tenant's report JSON to anyone who had or guessed the job UUID, with no auth check
// at all. This route re-verifies req.companyId against the job's companyId before streaming.
router.get('/:id/download', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [job] = await db.select().from(reportJobs)
    .where(and(eq(reportJobs.id, (req.params.id as string)), eq(reportJobs.companyId, req.companyId!)))
    .limit(1)
  if (!job) return res.fail(null, 'Report job not found', 404)
  if (job.status !== 'done') return res.fail(null, 'Report is not ready', 409)

  const filename = `${job.type}-${job.id}.json`
  const filePath = path.join(REPORTS_DIR, filename)
  if (!fs.existsSync(filePath)) return res.fail(null, 'Report file missing', 404)

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  fs.createReadStream(filePath).pipe(res)
}))

export default router
