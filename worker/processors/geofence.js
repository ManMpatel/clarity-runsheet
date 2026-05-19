const { getCollection } = require('../db/mongo')
const { getGeofenceState, setGeofenceState } = require('../db/redis')

function pointInPolygon(point, polygon) {
  const [x, y] = point
  const coords = polygon.coordinates[0]
  let inside = false

  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const [xi, yi] = coords[i]
    const [xj, yj] = coords[j]
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }

  return inside
}

async function processGeofences(imei, companyId, vehicleId, record) {
  const collection = await getCollection('geofences')
  const events = []

  const zones = await collection
    .find({ companyId, active: true })
    .toArray()

  const point = [record.longitude, record.latitude]

  for (const zone of zones) {
    const inside = pointInPolygon(point, zone.geometry)
    const prevState = await getGeofenceState(imei, zone._id.toString())
    const wasInside = prevState === 'inside'

    if (inside && !wasInside) {
      await setGeofenceState(imei, zone._id.toString(), 'inside')
      const event = await saveGeofenceEvent(
        imei, companyId, vehicleId, record, zone, 'enter'
      )
      events.push(event)
    } else if (!inside && wasInside) {
      await setGeofenceState(imei, zone._id.toString(), 'outside')
      const event = await saveGeofenceEvent(
        imei, companyId, vehicleId, record, zone, 'exit'
      )
      events.push(event)
    }
  }

  return events
}

async function saveGeofenceEvent(imei, companyId, vehicleId, record, zone, type) {
  const collection = await getCollection('geofence_events')

  const event = {
    type,
    imei,
    companyId,
    vehicleId,
    zoneId:    zone._id,
    zoneName:  zone.name,
    timestamp: new Date(record.timestamp),
    location: {
      type: 'Point',
      coordinates: [record.longitude, record.latitude],
    },
    createdAt: new Date(),
  }

  await collection.insertOne(event)
  return event
}

module.exports = { processGeofences }