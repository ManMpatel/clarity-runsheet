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
      .find({
        driverId: req.params.id,
        ...req.companyFilter,
      })
      .sort({ weekStart: -1 })
      .limit(12)
      .toArray()
    return res.json(history)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, mobile, licenceNumber, vehicleId } = req.body
    if (!name || !mobile) {
      return res.status(400).json({ error: 'Name and mobile required' })
    }

    const collection = await getCollection('drivers')
    const driver = {
      companyId:     req.companyId,
      name,
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
    const { name, mobile, licenceNumber, vehicleId, active } = req.body
    const collection = await getCollection('drivers')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { name, mobile, licenceNumber, vehicleId, active, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) return res.status(404).json({ error: 'Driver not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router