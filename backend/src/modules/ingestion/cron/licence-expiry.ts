// Ported from worker/cron/licence-expiry.js. Straightforward query-syntax port.
import cron from 'node-cron'
import { Resend } from 'resend'
import { and, eq, gte, lte } from 'drizzle-orm'
import { db } from '../../../db/client'
import { drivers, users } from '../../../db/schema'

const resend = new Resend(process.env.RESEND_API_KEY)

export function startLicenceExpiryCron() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Checking licence expiries')
    try {
      await checkLicenceExpiries()
    } catch (err: any) {
      console.error('[Cron] Licence expiry error:', err.message)
    }
  })
  console.log('[Cron] Licence expiry check scheduled — runs daily at 8am')
}

async function checkLicenceExpiries() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)

  const expiring = await db.select().from(drivers).where(and(
    eq(drivers.active, true),
    gte(drivers.licenceExpiry, today.toISOString().slice(0, 10)),
    lte(drivers.licenceExpiry, in30Days.toISOString().slice(0, 10)),
  ))

  if (expiring.length === 0) return

  const byCompany = new Map<string, typeof expiring>()
  for (const driver of expiring) {
    const list = byCompany.get(driver.companyId) ?? []
    list.push(driver)
    byCompany.set(driver.companyId, list)
  }

  for (const [companyId, companyDrivers] of byCompany) {
    const [admin] = await db.select().from(users).where(and(eq(users.companyId, companyId), eq(users.role, 'companyAdmin'))).limit(1)
    if (!admin) continue
    await sendExpiryEmail(admin.email, companyDrivers)
  }
}

async function sendExpiryEmail(adminEmail: string, driverList: any[]) {
  const today = new Date()

  const rows = driverList.map((d) => {
    const expiry = new Date(d.licenceExpiry)
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return `${d.name} — expires ${expiry.toLocaleDateString('en-AU')} (${daysLeft} day${daysLeft === 1 ? '' : 's'})`
  }).join('\n')

  await resend.emails.send({
    from: 'Clarity Fleet <noreply@claritysoftware.au>',
    to: adminEmail,
    subject: `Licence expiry reminder — ${driverList.length} driver${driverList.length === 1 ? '' : 's'} expiring soon`,
    text: `The following driver licence${driverList.length === 1 ? '' : 's'} expire within 30 days:\n\n${rows}\n\nUpdate licence details in your Clarity Fleet dashboard under Driver Management.`,
  })

  console.log(`[Cron] Licence expiry email sent to ${adminEmail} for ${driverList.length} driver(s)`)
}
