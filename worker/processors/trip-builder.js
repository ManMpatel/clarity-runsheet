const { getCollection } = require('../db/mongo')
const { getClient } = require('../db/redis')
const { autoClassifyTrip } = require('../services/fbt-classifier')

const TRIP_END_SECONDS = 300
const MIN_TRIP_DISTANCE_METRES = 200

async function processTripDetection(imei, companyId, vehicleId, record) {
  const redis = getClient()
  const tripKey = `trip:active:${imei}`

  const ignition = record.ignition
  const speed    = record.speed || 0

  const raw = await redis.get(tripKey)
  const activeTrip = raw ? JSON.parse(raw) : null

  if (!activeTrip) {
    if (ignition && speed > 0) {
      await startTrip(redis, tripKey, imei, companyId, vehicleId, record)
    }
    return
  }

  if (ignition || speed > 0) {
    await updateActiveTrip(redis, tripKey, activeTrip, record)
  } else {
    const secondsSinceMove = (Date.now() - activeTrip.lastMovement) / 1000
    if (secondsSinceMove >= TRIP_END_SECONDS) {
      await endTrip(redis, tripKey, activeTrip, record, vehicleId, companyId)
    }
  }
}

async function startTrip(redis, tripKey, imei, companyId, vehicleId, record) {
  const trip = {
    imei,
    companyId,
    vehicleId,
    startTime:     record.timestamp,
    startLocation: {
      type:        'Point',
      coordinates: [record.longitude, record.latitude],
    },
    lastLocation: {
      type:        'Point',
      coordinates: [record.longitude, record.latitude],
    },
    lastMovement:   Date.now(),
    maxSpeed:       record.speed || 0,
    distanceMetres: 0,
    prevLat:        record.latitude,
    prevLon:        record.longitude,
  }

  await redis.set(tripKey, JSON.stringify(trip))
  console.log(`[Trip] Started for IMEI ${imei}`)
}

async function updateActiveTrip(redis, tripKey, activeTrip, record) {
  const dist = haversine(
    activeTrip.prevLat, activeTrip.prevLon,
    record.latitude,    record.longitude
  )

  const updated = {
    ...activeTrip,
    lastLocation: {
      type:        'Point',
      coordinates: [record.longitude, record.latitude],
    },
    lastMovement:   Date.now(),
    maxSpeed:       Math.max(activeTrip.maxSpeed, record.speed || 0),
    distanceMetres: activeTrip.distanceMetres + dist,
    prevLat:        record.latitude,
    prevLon:        record.longitude,
  }

  await redis.set(tripKey, JSON.stringify(updated))
}

async function endTrip(redis, tripKey, activeTrip, record, vehicleId, companyId) {
  await redis.del(tripKey)

  if (activeTrip.distanceMetres < MIN_TRIP_DISTANCE_METRES) {
    console.log(`[Trip] Too short — discarded for IMEI ${activeTrip.imei}`)
    return
  }

  const startTime = new Date(activeTrip.startTime)
  const endTime   = new Date(record.timestamp)
  const durationMs = endTime - startTime
  const durationMinutes = Math.round(durationMs / 60000)
  const distanceKm = parseFloat((activeTrip.distanceMetres / 1000).toFixed(2))

  const collection = await getCollection('trips')
  const trip = {
    imei:          activeTrip.imei,
    companyId,
    vehicleId,
    startTime,
    endTime,
    startLocation: activeTrip.startLocation,
    endLocation: {
      type:        'Point',
      coordinates: [record.longitude, record.latitude],
    },
    distanceKm,
    durationMinutes,
    maxSpeed:       activeTrip.maxSpeed,
    classification: null,
    createdAt:      new Date(),
  }

  const result = await collection.insertOne(trip)
  await autoClassifyTrip(result.insertedId, companyId, startTime)
  console.log(`[Trip] Saved — ${distanceKm}km, ${durationMinutes}min for IMEI ${activeTrip.imei}`)
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

module.exports = { processTripDetection }