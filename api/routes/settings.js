const express = require('express')
const bcrypt = require('bcryptjs')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth, requireRole } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/company', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('companies')
    const company = await collection.findOne(
      { _id: new ObjectId(req.companyId) },
      { projection: { stripeCustomerId: 0 } }
    )
    if (!company) return res.status(404).json({ error: 'Company not found' })
    return res.json(company)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/company', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, phone, address, timezone, abn, website } = req.body
    const collection = await getCollection('companies')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.companyId) },
      { name, phone, address, timezone, abn, website, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/users', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const collection = await getCollection('users')
    const users = await collection
      .find(req.companyFilter, { projection: { passwordHash: 0 } })
      .toArray()
    return res.json(users)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/users', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' })
    }

    const collection = await getCollection('users')
    const existing = await collection.findOne({ email: email.toLowerCase() })
    if (existing) return res.status(409).json({ error: 'Email already exists' })

    const passwordHash = await bcrypt.hash(password, 12)
    const user = {
      companyId:        req.companyId,
      name,
      email:            email.toLowerCase(),
      passwordHash,
      role,
      subscriptionTier: 'entry',
      createdAt:        new Date(),
    }

    const result = await collection.insertOne(user)
    const { passwordHash: _, ...safeUser } = user
    return res.status(201).json({ ...safeUser, _id: result.insertedId })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/users/:id/role', requireAuth, requireCompany,
  requireRole('companyAdmin', 'superAdmin'), async (req, res) => {
  try {
    const { role } = req.body
    const collection = await getCollection('users')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { passwordHash: 0 } }
    )

    if (!result) return res.status(404).json({ error: 'User not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/settings/onboarding-complete
// Called when user finishes or skips the onboarding wizard
// Sets flag on company record so wizard never shows again
router.put('/onboarding-complete', requireAuth, requireCompany, async (req, res) => {
  try {
    const companies = await getCollection('companies')
    await companies.updateOne(
      { _id: new ObjectId(req.companyId) },
      { $set: { onboardingComplete: true, updatedAt: new Date() } }
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

module.exports = router
