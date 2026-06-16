const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth, requireRole } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('vehicles')
    const vehicles = await collection
      .find(req.companyFilter)
      .sort({ name: 1 })
      .toArray()
    return res.json(vehicles)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id([0-9a-fA-F]{24})', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('vehicles')
    const vehicle = await collection.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })
    return res.json(vehicle)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, imei, registration, make, model, year, driverMobile } = req.body
    if (!name || !imei) return res.status(400).json({ error: 'Name and IMEI required' })

    const collection = await getCollection('vehicles')
    const existing = await collection.findOne({ imei })
    if (existing) return res.status(409).json({ error: 'IMEI already registered' })

    const vehicle = {
  companyId:            req.companyId,
  name,
  imei,
  registration:         registration || null,
  make:                 make || null,
  model:                model || null,
  year:                 year || null,
  driverMobile:         driverMobile || null,
  tier:                 'entry',
  tierChangesRemaining: 3,
  tierHistory:          [],
  active:               true,
  createdAt:            new Date(),
}
    const result = await collection.insertOne(vehicle)
    return res.status(201).json({ ...vehicle, _id: result.insertedId })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, registration, make, model, year, driverMobile, active } = req.body
    const collection = await getCollection('vehicles')
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { name, registration, make, model, year, driverMobile, active, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Vehicle not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/:id', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const collection = await getCollection('vehicles')
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { active: false, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )
    if (!result) return res.status(404).json({ error: 'Vehicle not found' })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})


router.put('/:id/tier', requireAuth, requireCompany, async (req, res) => {
  try {
    const { tier } = req.body
    if (!['entry', 'mid', 'top'].includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' })
    }

    const collection = await getCollection('vehicles')
    const vehicle = await collection.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })

    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' })
    if (vehicle.tierChangesRemaining <= 0) {
      return res.status(403).json({ error: 'No tier changes remaining. Contact support.' })
    }

    const companies = await getCollection('companies')
    const company = await companies.findOne({
      _id: new ObjectId(req.companyId)
    })

    const slots = company.slots || {}
    const usedSlots = await countUsedSlots(req.companyId, tier, vehicle._id.toString())
    const totalSlots = slots[`${tier}Slots`] || 0

    if (usedSlots >= totalSlots) {
      return res.status(403).json({
        error: `No ${tier} slots available`,
        used: usedSlots,
        total: totalSlots,
      })
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      {
        $set: {
          tier,
          tierChangesRemaining: vehicle.tierChangesRemaining - 1,
          updatedAt: new Date(),
        },
        $push: {
          tierHistory: {
            from:      vehicle.tier || 'entry',
            to:        tier,
            changedAt: new Date(),
            changedBy: req.user.userId,
          }
        }
      },
      { returnDocument: 'after' }
    )

    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

async function countUsedSlots(companyId, tier, excludeVehicleId) {
  const collection = await getCollection('vehicles')
  const count = await collection.countDocuments({
    companyId,
    tier,
    active: true,
    _id: { $ne: new ObjectId(excludeVehicleId) }
  })
  return count
}


router.get('/status', requireAuth, requireCompany, async (req, res) => {
  try {
    const vehicles = await getCollection('vehicles')
    const telemetry = await getCollection('telemetry_events')
    const fleet = await vehicles.find(req.companyFilter).toArray()

    const status = await Promise.all(fleet.map(async (v) => {
      const latest = await telemetry.findOne(
        { 'metadata.vehicleId': v._id.toString() },
        { sort: { timestamp: -1 } }
      )
      const lastSeen = latest?.timestamp || null
      const ageMs = lastSeen ? Date.now() - new Date(lastSeen).getTime() : null

      let state = 'offline'
      if (ageMs !== null) {
        if (ageMs < 2 * 60 * 1000)  state = 'online'
        else if (ageMs < 15 * 60 * 1000) state = 'idle'
      }

      return { vehicleId: v._id.toString(), lastSeen, state }
    }))

    return res.json(status)
  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack })
  }
})

module.exports = router
