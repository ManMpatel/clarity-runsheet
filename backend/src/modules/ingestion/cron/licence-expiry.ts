const cron = require('node-cron')
const { getCollection } = require('../db/mongo')
const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

function startLicenceExpiryCron() {
  cron.schedule('0 8 * * *', async () => {
    console.log('[Cron] Checking licence expiries')
    try {
      await checkLicenceExpiries()
    } catch (err) {
      console.error('[Cron] Licence expiry error:', err.message)
    }
  })
  console.log('[Cron] Licence expiry check scheduled — runs daily at 8am')
}

async function checkLicenceExpiries() {
  const drivers = await getCollection('drivers')
  const users   = await getCollection('users')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const in30Days = new Date(today)
  in30Days.setDate(in30Days.getDate() + 30)

  const expiring = await drivers.find({
    active:        true,
    licenceExpiry: { $gte: today, $lte: in30Days },
  }).toArray()

  if (expiring.length === 0) return

  const byCompany = {}
  for (const driver of expiring) {
    if (!byCompany[driver.companyId]) byCompany[driver.companyId] = []
    byCompany[driver.companyId].push(driver)
  }

  for (const [companyId, companyDrivers] of Object.entries(byCompany)) {
    const admin = await users.findOne({ companyId, role: 'companyAdmin' })
    if (!admin) continue
    await sendExpiryEmail(admin.email, companyDrivers)
  }
}

async function sendExpiryEmail(adminEmail, drivers) {
  const today = new Date()

  const rows = drivers.map(d => {
    const expiry    = new Date(d.licenceExpiry)
    const daysLeft  = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    return `${d.name} — expires ${expiry.toLocaleDateString('en-AU')} (${daysLeft} day${daysLeft === 1 ? '' : 's'})`
  }).join('\n')

  await resend.emails.send({
    from:    'Clarity Fleet <noreply@claritysoftware.au>',
    to:      adminEmail,
    subject: `Licence expiry reminder — ${drivers.length} driver${drivers.length === 1 ? '' : 's'} expiring soon`,
    text:    `The following driver licence${drivers.length === 1 ? '' : 's'} expire within 30 days:\n\n${rows}\n\nUpdate licence details in your Clarity Fleet dashboard under Driver Management.`,
  })

  console.log(`[Cron] Licence expiry email sent to ${adminEmail} for ${drivers.length} driver(s)`)
}

module.exports = { startLicenceExpiryCron }