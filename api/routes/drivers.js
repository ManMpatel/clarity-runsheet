const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth, requireRole } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('drivers')
    const drivers = await collection
      .find(req.companyFilter)
      .sort({ name: 1 })
      .toArray()
    return res.json(drivers)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('drivers')
    const driver = await collection.findOne({
      _id: new ObjectId(req.params.id),
      ...req.companyFilter,
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })
    return res.json(driver)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/:id/score', requireAuth, requireCompany, async (req, res) => {
  try {
    const scores = await getCollection('safety_scores')
    const history = await scores
      .find({ driverId: req.params.id, ...req.companyFilter })
      .sort({ weekStart: -1 })
      .limit(12)
      .toArray()
    return res.json(history)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/drivers/:id/history
// Permanent log of every vehicle assignment change — never deleted
router.get('/:id/history', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('driver_history')
    const history = await collection
      .find({ driverId: req.params.id, companyId: req.companyId })
      .sort({ startedAt: -1 })
      .toArray()
    return res.json(history)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, email, mobile, licenceNumber, vehicleId } = req.body
    if (!name || !mobile || !email) {
      return res.status(400).json({ error: 'Name, email and mobile required' })
    }

    const collection = await getCollection('drivers')
    const driver = {
      companyId:     req.companyId,
      name,
      email:         email.toLowerCase(),
      mobile,
      licenceNumber: licenceNumber || null,
      vehicleId:     vehicleId || null,
      active:        true,
      createdAt:     new Date(),
    }

    const result = await collection.insertOne(driver)
    return res.status(201).json({ ...driver, _id: result.insertedId })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, email, mobile, licenceNumber, vehicleId, active } = req.body
    const collection = await getCollection('drivers')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { name, email, mobile, licenceNumber, vehicleId, active, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return res.status(404).json({ error: 'Driver not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/drivers/:id/assign-vehicle
// Assigns driver to a van — logs permanent history record
// When driver changes, old record gets endedAt, new record created
router.put('/:id/assign-vehicle', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { vehicleId } = req.body
    const driverId = req.params.id

    const drivers    = await getCollection('drivers')
    const history    = await getCollection('driver_history')

    const driver = await drivers.findOne({
      _id: new ObjectId(driverId),
      ...req.companyFilter,
    })
    if (!driver) return res.status(404).json({ error: 'Driver not found' })

    // Close off previous assignment if exists
    if (driver.vehicleId) {
      await history.updateOne(
        { driverId, vehicleId: driver.vehicleId, endedAt: null },
        { $set: { endedAt: new Date() } }
      )
    }

    // Update driver record
    await drivers.updateOne(
      { _id: new ObjectId(driverId) },
      { $set: { vehicleId: vehicleId || null, updatedAt: new Date() } }
    )

    // Create new history record if assigning to a vehicle
    if (vehicleId) {
      await history.insertOne({
        companyId:  req.companyId,
        driverId,
        vehicleId,
        driverName: driver.name,
        startedAt:  new Date(),
        endedAt:    null,
      })
    }

    return res.json({ success: true, driverId, vehicleId: vehicleId || null })
  } catch (err) {
    console.error('[Drivers] Assign vehicle error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router