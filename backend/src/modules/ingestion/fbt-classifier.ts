const { getCollection } = require('../db/mongo')

// Checks if a trip falls within business hours and days
// Returns 'business' or 'personal'
function classifyTrip(startTime, settings) {
  const date = new Date(startTime)

  // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const dayOfWeek = date.getDay()

  const businessDays = settings.businessDays || [1, 2, 3, 4, 5]
  if (!businessDays.includes(dayOfWeek)) {
    return 'personal'
  }

  const hours   = date.getHours()
  const minutes = date.getMinutes()
  const tripMinutes = hours * 60 + minutes

  const [startH, startM] = settings.businessHours.start.split(':').map(Number)
  const [endH,   endM]   = settings.businessHours.end.split(':').map(Number)

  const businessStart = startH * 60 + startM
  const businessEnd   = endH   * 60 + endM

  if (tripMinutes >= businessStart && tripMinutes < businessEnd) {
    return 'business'
  }

  return 'personal'
}

// Called from trip-builder when a trip ends
// Looks up company FBT settings and auto-classifies
async function autoClassifyTrip(tripId, companyId, startTime) {
  try {
    const settingsCol = await getCollection('fbt_settings')
    const settings    = await settingsCol.findOne({ companyId })

    // No settings saved yet — leave as unclassified
    if (!settings) return null

    // mode all_business — everything counts as business
    if (settings.mode === 'all_business') {
      await updateTripClassification(tripId, 'business', 'auto')
      return 'business'
    }

    const classification = classifyTrip(startTime, settings)
    await updateTripClassification(tripId, classification, 'auto')
    return classification
  } catch (err) {
    console.error('[FBT] Auto classify error:', err.message)
    return null
  }
}

async function updateTripClassification(tripId, classification, classifiedBy) {
  const trips = await getCollection('trips')
  await trips.updateOne(
    { _id: tripId },
    {
      $set: {
        classification,
        classifiedBy,
        classifiedAt: new Date(),
      }
    }
  )
}

module.exports = { autoClassifyTrip }