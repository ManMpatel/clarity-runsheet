const express = require('express')
const bcrypt = require('bcryptjs')
const { getCollection } = require('../db/mongo')
const { requireSuperAdmin } = require('../middleware/superAdmin')

const router = express.Router()

router.get('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const collection = await getCollection('companies')
    const companies = await collection.find({}).sort({ createdAt: -1 }).toArray()

    const users = await getCollection('users')
    const enriched = await Promise.all(companies.map(async (c) => {
      const admin = await users.findOne(
        { companyId: c._id.toString(), role: 'companyAdmin' },
        { projection: { email: 1, name: 1, mobile: 1 } }
      )
      return { ...c, email: admin?.email || null, adminName: admin?.name || null, phone: admin?.mobile || null }
    }))

    return res.json(enriched)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const { name, slug, adminName, adminEmail, adminPassword, subscriptionTier } = req.body
    if (!name || !slug || !adminEmail || !adminPassword) {
      return res.status(400).json({ error: 'All fields required' })
    }

    const companies = await getCollection('companies')
    const existing = await companies.findOne({ slug })
    if (existing) return res.status(409).json({ error: 'Slug already exists' })

    const company = {
      name,
      slug,
      subscriptionTier: subscriptionTier || 'entry',
      active:           true,
      createdAt:        new Date(),
    }

    const companyResult = await companies.insertOne(company)
    const companyId = companyResult.insertedId.toString()

    const passwordHash = await bcrypt.hash(adminPassword, 12)
    const users = await getCollection('users')
    const user = {
      companyId,
      name:             adminName || adminEmail,
      email:            adminEmail.toLowerCase(),
      passwordHash,
      role:             'companyAdmin',
      subscriptionTier: subscriptionTier || 'entry',
      createdAt:        new Date(),
    }

    await users.insertOne(user)
    return res.status(201).json({ company: { ...company, _id: companyResult.insertedId } })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/companies/:id/tier', requireSuperAdmin, async (req, res) => {
  try {
    const { subscriptionTier } = req.body
    const { ObjectId } = require('mongodb')
    const collection = await getCollection('companies')

    await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { subscriptionTier, updatedAt: new Date() } }
    )

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})


router.get('/companies/:id/slots', requireSuperAdmin, async (req, res) => {
  try {
    const { ObjectId } = require('mongodb')
    const companies = await getCollection('companies')
    const company = await companies.findOne({
      _id: new ObjectId(req.params.id)
    })
    if (!company) return res.status(404).json({ error: 'Company not found' })

    const vehicles = await getCollection('vehicles')
    const entryUsed = await vehicles.countDocuments({ companyId: req.params.id, tier: 'entry', active: true })
    const midUsed   = await vehicles.countDocuments({ companyId: req.params.id, tier: 'mid',   active: true })
    const topUsed   = await vehicles.countDocuments({ companyId: req.params.id, tier: 'top',   active: true })

    return res.json({
      company,
      slots: company.slots || { entrySlots: 0, midSlots: 0, topSlots: 0 },
      used:  { entry: entryUsed, mid: midUsed, top: topUsed },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/companies/:id/slots', requireSuperAdmin, async (req, res) => {
  try {
    const { entrySlots, midSlots, topSlots } = req.body
    const { ObjectId } = require('mongodb')
    const companies = await getCollection('companies')

    const result = await companies.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          slots: {
            entrySlots: parseInt(entrySlots) || 0,
            midSlots:   parseInt(midSlots)   || 0,
            topSlots:   parseInt(topSlots)   || 0,
          },
          updatedAt: new Date(),
        }
      },
      { returnDocument: 'after' }
    )
    const highestTier = parseInt(topSlots) > 0 ? 'top' : parseInt(midSlots) > 0 ? 'mid' : parseInt(entrySlots) > 0 ? 'entry' : 'locked'
    await companies.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { subscriptionTier: highestTier } }
    )
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})



router.get('/upgrade-requests', requireSuperAdmin, async (req, res) => {
  try {
    const collection = await getCollection('upgrade_requests')
    const requests = await collection
      .find({})
      .sort({ createdAt: -1 })
      .toArray()
    return res.json(requests)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/upgrade-requests/:id/action', requireSuperAdmin, async (req, res) => {
  try {
    const { action } = req.body
    const { ObjectId } = require('mongodb')
    const collection = await getCollection('upgrade_requests')
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: action, actionedAt: new Date() } },
      { returnDocument: 'after' }
    )
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/companies/:id/set-role', requireSuperAdmin, async (req, res) => {
  try {
    const { role } = req.body
    if (!['contractor', 'garageOwner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const { ObjectId } = require('mongodb')
    const companies = await getCollection('companies')
    await companies.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: { role, updatedAt: new Date() } }
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/devices', requireSuperAdmin, async (req, res) => {
  try {
    const devices = await getCollection('devices')
    const list = await devices.find({}).sort({ registeredAt: -1 }).toArray()
    return res.json(list)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})


router.get('/companies/:id/devices', requireSuperAdmin, async (req, res) => {
  try {
    const devices = await getCollection('devices')
    const list = await devices
      .find({ registeredByCompanyId: req.params.id })
      .sort({ registeredAt: -1 })
      .toArray()
    return res.json(list)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/companies/:id/vehicles', requireSuperAdmin, async (req, res) => {
  try {
    const vehicles = await getCollection('vehicles')
    const list = await vehicles
      .find({ companyId: req.params.id, active: true })
      .sort({ createdAt: -1 })
      .toArray()
    return res.json(list)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router