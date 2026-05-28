const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')
const { getClient } = require('../db/redis')

const router = express.Router()

router.get('/live', requireAuth, requireCompany, async (req, res) => {
  try {
    const redis = getClient()
    const vehicles = await getCollection('vehicles')
    const fleet = await vehicles
      .find({ ...req.companyFilter, active: true })
      .toArray()

    const states = await Promise.all(
      fleet.map(async (v) => {
        const raw = await redis.get(`van:state:${v.imei}`)
        const state = raw ? JSON.parse(raw) : null
        return { vehicle: v, state }
      })
    )
    return res.json(states)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/history', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, from, to, limit = 1000 } = req.query
    if (!vehicleId || !from || !to) {
      return res.status(400).json({ error: 'vehicleId, from, to required' })
    }
    const collection = await getCollection('telemetry_events')
    const records = await collection
      .find({
        'metadata.companyId': req.companyId,
        'metadata.vehicleId': vehicleId,
        timestamp: { $gte: new Date(from), $lte: new Date(to) },
      })
      .sort({ timestamp: 1 })
      .limit(parseInt(limit))
      .toArray()
    return res.json(records)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router