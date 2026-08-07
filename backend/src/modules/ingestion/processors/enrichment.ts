const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getStatus(doc) {
  if (doc.speed > 0) return 'moving'
  if (doc.ignition)  return 'idle'
  return 'stopped'
}

async function reverseGeocode(lat, lon) {
  if (!MAPBOX_TOKEN) return null
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${MAPBOX_TOKEN}&types=address,street&limit=1`
    const res  = await fetch(url)
    const data = await res.json()
    return data.features?.[0]?.place_name || null
  } catch (err) {
    console.error('[Enrichment] Geocode error:', err.message)
    return null
  }
}

async function enrichAndSaveVanState(redis, imei, companyId, vehicleId, doc) {
  const stateKey = `van:state:${imei}`
  const raw      = await redis.get(stateKey)
  const prev     = raw ? JSON.parse(raw) : null

  const lat           = doc.location.coordinates[1]
  const lon           = doc.location.coordinates[0]
  const currentStatus = getStatus(doc)
  const prevStatus    = prev?.status

  // Since timer — reset timestamp when status changes
  const stateChangedAt = (currentStatus !== prevStatus)
    ? Date.now()
    : (prev?.stateChangedAt || Date.now())

  // Today's km — delta from odometer at midnight
  const todayDate = getTodayDate()
  let todayKm          = prev?.todayKm || 0
  let todayOdometerBase = prev?.todayOdometerBase

  if (!todayOdometerBase || prev?.todayDate !== todayDate) {
    todayOdometerBase = doc.odometer || 0
    todayKm = 0
  } else if (doc.odometer != null && doc.odometer > todayOdometerBase) {
    todayKm = parseFloat((doc.odometer - todayOdometerBase).toFixed(1))
  }

  // Reverse geocode — only on status change or no address, max once per minute
  let address = prev?.address || null
  const cooldownKey = `geocode:cooldown:${imei}`
  const onCooldown  = await redis.get(cooldownKey)

  if (!onCooldown && (!address || currentStatus !== prevStatus)) {
    const newAddress = await reverseGeocode(lat, lon)
    if (newAddress) {
      address = newAddress
      await redis.set(cooldownKey, '1')
      await redis.expire(cooldownKey, 60)
    }
  }

  // Save enriched state to Redis
  const enriched = {
    imei,
    companyId,
    vehicleId,
    latitude:         lat,
    longitude:        lon,
    speed:            doc.speed,
    angle:            doc.angle,
    ignition:         doc.ignition,
    externalVoltage:  doc.externalVoltage,
    batteryVoltage:   doc.batteryVoltage,
    gsmSignal:        doc.gsmSignal,
    odometer:         doc.odometer,
    timestamp:        doc.timestamp,
    address,
    todayKm,
    todayOdometerBase,
    todayDate,
    status:           currentStatus,
    stateChangedAt,
    updatedAt:        Date.now(),
  }

  await redis.set(stateKey, JSON.stringify(enriched))
  await redis.expire(stateKey, 86400)

  return enriched
}

module.exports = { enrichAndSaveVanState }
