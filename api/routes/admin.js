const express = require('express')
const bcrypt = require('bcryptjs')
const { getCollection } = require('../db/mongo')
const { requireSuperAdmin } = require('../middleware/superAdmin')

const router = express.Router()

router.get('/companies', requireSuperAdmin, async (req, res) => {
  try {
    const collection = await getCollection('companies')
    const companies = await collection.find({}).sort({ createdAt: -1 }).toArray()
    return res.json(companies)
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

module.exports = router