const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth, requireRole } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('geofences')
    const zones = await collection
      .find(req.companyFilter)
      .sort({ name: 1 })
      .toArray()
    return res.json(zones)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id([0-9a-fA-F]{24})', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('geofences')
    const zone = await collection.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    if (!zone) return res.status(404).json({ error: 'Zone not found' })
    return res.json(zone)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCompany,
  requireRole('companyAdmin', 'fleetManager', 'superAdmin'), async (req, res) => {
  try {
    const { name, geometry, alertOnExit, alertOnEntry, activeHoursOnly, vehicleIds, centre, radiusMetres } = req.body
    if (!name || !geometry) {
      return res.status(400).json({ error: 'Name and geometry required' })
    }

    const collection = await getCollection('geofences')
    const zone = {
      companyId:       req.companyId,
      name,
      geometry,
      alertOnExit:     alertOnExit ?? true,
      alertOnEntry:    alertOnEntry ?? false,
      activeHoursOnly: activeHoursOnly ?? false,
      active:          true,
      vehicleIds:      vehicleIds || [],
      centre:          centre || null,
      radiusMetres:    radiusMetres || null,
      createdAt:       new Date(),
    }

    const result = await collection.insertOne(zone)
    return res.status(201).json({ ...zone, _id: result.insertedId })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', requireAuth, requireCompany,
  requireRole('companyAdmin', 'fleetManager', 'superAdmin'), async (req, res) => {
  try {
    const { name, geometry, alertOnExit, alertOnEntry, activeHoursOnly, active, vehicleIds } = req.body
    const collection = await getCollection('geofences')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { name, geometry, alertOnExit, alertOnEntry, activeHoursOnly, active, vehicleIds: vehicleIds || [], updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return res.status(404).json({ error: 'Zone not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const collection = await getCollection('geofences')
    await collection.deleteOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/events', requireAuth, requireCompany, async (req, res) => {
  try {
    const { from, to, limit = 50 } = req.query
    const filter = {
      ...req.companyFilter,
      zoneId: new ObjectId(req.params.id),
    }
    if (from && to) {
      filter.timestamp = { $gte: new Date(from), $lte: new Date(to) }
    }

    const collection = await getCollection('geofence_events')
    const events = await collection
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .toArray()

    return res.json(events)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
