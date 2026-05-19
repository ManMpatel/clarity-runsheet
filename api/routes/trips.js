const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, from, to, page = 1, limit = 20 } = req.query

    const filter = { ...req.companyFilter }
    if (vehicleId) filter.vehicleId = vehicleId
    if (from && to) {
      filter.startTime = { $gte: new Date(from) }
      filter.endTime   = { $lte: new Date(to) }
    }

    const collection = await getCollection('trips')
    const total = await collection.countDocuments(filter)
    const trips = await collection
      .find(filter)
      .sort({ startTime: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray()

    return res.json({ trips, total, page: parseInt(page) })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('trips')
    const trip = await collection.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    if (!trip) return res.status(404).json({ error: 'Trip not found' })
    return res.json(trip)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/replay', requireAuth, requireCompany, async (req, res) => {
  try {
    const trips = await getCollection('trips')
    const trip = await trips.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    if (!trip) return res.status(404).json({ error: 'Trip not found' })

    const telemetry = await getCollection('telemetry_events')
    const points = await telemetry
      .find({
        'metadata.companyId': req.companyId,
        'metadata.vehicleId': trip.vehicleId,
        timestamp: { $gte: trip.startTime, $lte: trip.endTime },
      })
      .sort({ timestamp: 1 })
      .project({
        timestamp: 1,
        'location.coordinates': 1,
        speed: 1,
        angle: 1,
      })
      .toArray()

    return res.json({ trip, points })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router