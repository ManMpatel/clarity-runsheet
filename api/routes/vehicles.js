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

router.get('/:id', requireAuth, requireCompany, async (req, res) => {
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
      companyId: req.companyId, name, imei,
      registration: registration || null,
      make: make || null, model: model || null,
      year: year || null, driverMobile: driverMobile || null,
      active: true, createdAt: new Date(),
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

module.exports = router
