const cron = require('node-cron')
const { getCollection } = require('../db/mongo')

function startSafetyScoreCron() {
  cron.schedule('0 0 * * 0', async () => {
    console.log('[Cron] Running weekly safety score calculation')
    try {
      await calculateAllScores()
    } catch (err) {
      console.error('[Cron] Safety score error:', err.message)
    }
  })
  console.log('[Cron] Safety score job scheduled — runs Sunday midnight')
}

async function calculateAllScores() {
  const companies = await getCollection('companies')
  const allCompanies = await companies.find({ active: true }).toArray()

  for (const company of allCompanies) {
    await calculateCompanyScores(company._id.toString())
  }
}

async function calculateCompanyScores(companyId) {
  const drivers = await getCollection('drivers')
  const companyDrivers = await drivers
    .find({ companyId, active: true })
    .toArray()

  for (const driver of companyDrivers) {
    await calculateDriverScore(companyId, driver)
  }
}

async function calculateDriverScore(companyId, driver) {
  const weekStart = getLastMonday()
  const weekEnd   = new Date()

  const events = await getCollection('driver_events')
  const driverEvents = await events.find({
    companyId,
    vehicleId:  driver.vehicleId,
    timestamp:  { $gte: weekStart, $lte: weekEnd },
  }).toArray()

  const harshBraking    = driverEvents.filter(e => e.type === 'harshBraking').length
  const harshAccel      = driverEvents.filter(e => e.type === 'harshAcceleration').length
  const harshCornering  = driverEvents.filter(e => e.type === 'harshCornering').length
  const speedingEvents  = driverEvents.filter(e => e.type === 'speeding').length

  const brakingScore    = Math.max(0, 100 - harshBraking * 5)
  const accelScore      = Math.max(0, 100 - harshAccel * 5)
  const corneringScore  = Math.max(0, 100 - harshCornering * 5)
  const speedingScore   = Math.max(0, 100 - speedingEvents * 10)

  const overallScore = Math.round(
    (brakingScore + accelScore + corneringScore + speedingScore) / 4
  )

  const scores = await getCollection('safety_scores')
  await scores.insertOne({
    companyId,
    driverId:       driver._id.toString(),
    weekStart,
    weekEnd,
    brakingScore,
    accelScore,
    corneringScore,
    speedingScore,
    overallScore,
    eventCount:     driverEvents.length,
    createdAt:      new Date(),
  })

  console.log(`[Cron] Score for ${driver.name}: ${overallScore}`)
}

function getLastMonday() {
  const d    = new Date()
  const day  = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

module.exports = { startSafetyScoreCron }