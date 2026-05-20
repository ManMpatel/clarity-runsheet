const cron = require('node-cron')
const { getCollection } = require('../db/mongo')
const { getClient } = require('../db/redis')

function startMaintenanceCron() {
  cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Running daily maintenance check')
    try {
      await checkMaintenanceDue()
    } catch (err) {
      console.error('[Cron] Maintenance check error:', err.message)
    }
  })
  console.log('[Cron] Maintenance check scheduled — runs 6am daily')
}

async function checkMaintenanceDue() {
  const companies = await getCollection('companies')
  const allCompanies = await companies.find({ active: true }).toArray()

  for (const company of allCompanies) {
    await checkCompanyMaintenance(company._id.toString())
  }
}

async function checkCompanyMaintenance(companyId) {
  const now      = new Date()
  const in7Days  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const maintenance = await getCollection('maintenance')
  const due = await maintenance.find({
    companyId,
    status:  'pending',
    dueDate: { $lte: in7Days },
  }).toArray()

  if (due.length === 0) return

  const vehicles = await getCollection('vehicles')
  const redis    = getClient()

  for (const record of due) {
    const vehicle = await vehicles.findOne({ _id: record.vehicleId })
    const key     = `maintenance:notified:${record._id}`
    const already = await redis.get(key)
    if (already) continue

    console.log(`[Cron] Maintenance due: ${record.type} for vehicle ${vehicle?.name || record.vehicleId}`)

    await redis.set(key, '1', 'EX', 86400)

    const alerts = await getCollection('alerts')
    await alerts.insertOne({
      type:      'maintenanceDue',
      companyId,
      vehicleId: record.vehicleId?.toString(),
      message:   `${record.type} due ${
        new Date(record.dueDate).toLocaleDateString('en-AU')
      } for ${vehicle?.name || 'van'}`,
      severity:  'info',
      read:      false,
      createdAt: new Date(),
    })
  }
}

module.exports = { startMaintenanceCron }