const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')
const { requireTier } = require('../middleware/requireTier')

const router = express.Router()

router.get('/driver-scores', requireAuth, requireCompany, async (req, res) => {
  try {
    const { from, to } = req.query
    const filter = { ...req.companyFilter }
    if (from && to) {
      filter.weekStart = { $gte: new Date(from), $lte: new Date(to) }
    }

    const collection = await getCollection('safety_scores')
    const scores = await collection
      .find(filter)
      .sort({ weekStart: -1 })
      .toArray()

    return res.json(scores)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/fuel-idle', requireAuth, requireCompany,
  requireTier('mid'), async (req, res) => {
  try {
    const { vehicleId, from, to } = req.query
    const filter = {
      'metadata.companyId': req.companyId,
      timestamp: {
        $gte: new Date(from),
        $lte: new Date(to),
      },
    }
    if (vehicleId) filter['metadata.vehicleId'] = vehicleId

    const collection = await getCollection('telemetry_events')
    const records = await collection
      .find(filter)
      .project({ timestamp: 1, speed: 1, fuelLevel: 1, 'metadata.vehicleId': 1 })
      .toArray()

    const idleRecords = records.filter(r => r.speed === 0 && r.fuelLevel)
    return res.json({ total: records.length, idleCount: idleRecords.length, records: idleRecords })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/trip-summary', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, from, to } = req.query
    const filter = { ...req.companyFilter }
    if (vehicleId) filter.vehicleId = vehicleId
    if (from && to) {
      filter.startTime = { $gte: new Date(from), $lte: new Date(to) }
    }

    const collection = await getCollection('trips')
    const trips = await collection.find(filter).toArray()

    const summary = {
      totalTrips:   trips.length,
      totalKm:      trips.reduce((s, t) => s + (t.distanceKm || 0), 0),
      totalDuration:trips.reduce((s, t) => s + (t.durationMinutes || 0), 0),
      avgKmPerTrip: trips.length
        ? (trips.reduce((s, t) => s + (t.distanceKm || 0), 0) / trips.length).toFixed(1)
        : 0,
    }

    return res.json({ summary, trips })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/vehicle-health', requireAuth, requireCompany,
  requireTier('mid'), async (req, res) => {
  try {
    const vehicles = await getCollection('vehicles')
    const fleet = await vehicles.find(req.companyFilter).toArray()

    const telemetry = await getCollection('telemetry_events')
    const healthData = await Promise.all(
      fleet.map(async (v) => {
        const latest = await telemetry.findOne(
          { 'metadata.vehicleId': v._id.toString() },
          { sort: { timestamp: -1 } }
        )
        return { vehicle: v, latest }
      })
    )

    return res.json(healthData)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
