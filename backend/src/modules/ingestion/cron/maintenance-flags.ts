// Ported from worker/cron/maintenance-flags.js. The old 24h dedup cache was a Redis key
// (`maintenance:notified:{id}` EX 86400) — replaced here with the new `maintenance.lastFlaggedAt`
// column (see Phase 3 schema note) rather than an in-memory map, since this dedup specifically
// benefits from surviving an ingestion restart (unlike alert-cooldown/geofence-debounce state).
import cron from 'node-cron'
import { eq, and, lte, or, isNull } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies, maintenance, vehicles, alerts } from '../../../db/schema'

const DEDUP_MS = 24 * 60 * 60 * 1000

export function startMaintenanceCron() {
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Running daily maintenance check')
    try {
      await checkMaintenanceDue()
    } catch (err: any) {
      console.error('[Cron] Maintenance check error:', err.message)
    }
  })
  console.log('[Cron] Maintenance check scheduled — runs 6am daily')
}

async function checkMaintenanceDue() {
  const allCompanies = await db.select().from(companies).where(eq(companies.active, true))
  for (const company of allCompanies) {
    await checkCompanyMaintenance(company.id)
  }
}

async function checkCompanyMaintenance(companyId: string) {
  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const due = await db.select().from(maintenance).where(and(
    eq(maintenance.companyId, companyId),
    eq(maintenance.status, 'pending'),
    lte(maintenance.dueDate, in7Days),
  ))

  for (const record of due) {
    const alreadyNotified = record.lastFlaggedAt && (now.getTime() - new Date(record.lastFlaggedAt).getTime()) < DEDUP_MS
    if (alreadyNotified) continue

    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, record.vehicleId)).limit(1)

    console.log(`[Cron] Maintenance due: ${record.type} for vehicle ${vehicle?.name || record.vehicleId}`)

    await db.update(maintenance).set({ lastFlaggedAt: now }).where(eq(maintenance.id, record.id))

    await db.insert(alerts).values({
      type: 'maintenanceDue',
      companyId,
      vehicleId: record.vehicleId,
      message: `${record.type} due ${new Date(record.dueDate!).toLocaleDateString('en-AU')} for ${vehicle?.name || 'van'}`,
      severity: 'info',
      timestamp: now,
    })
  }
}
