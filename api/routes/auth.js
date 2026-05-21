const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const users = await getCollection('users')
    const user = await users.findOne({ email: email.toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      {
        userId:           user._id.toString(),
        companyId:        user.companyId.toString(),
        role:             user.role,
        subscriptionTier: user.subscriptionTier || 'entry',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    const companies = await getCollection('companies')
    const company = await companies.findOne({ _id: require('mongodb').ObjectId.createFromHexString(user.companyId.toString()) })

    return res.json({
      token,
      onboardingComplete: company?.onboardingComplete || false,
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      }
    })
  } catch (err) {
    console.error('[Auth] Login error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/signup', async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body
    if (!companyName || !name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password too short' })
    }

    const users = await getCollection('users')
    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const companies = await getCollection('companies')
    const slug = companyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const existingCompany = await companies.findOne({ slug })

    const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

    const company = {
      name:             companyName,
      slug:             finalSlug,
      subscriptionTier: 'locked',
      slots: {
        entrySlots: 0,
        midSlots:   0,
        topSlots:   0,
      },
      active:    true,
      createdAt: new Date(),
    }

    const companyResult = await companies.insertOne(company)
    const companyId = companyResult.insertedId.toString()

    const passwordHash = await bcrypt.hash(password, 12)
    const user = {
      companyId,
      name,
      email:            email.toLowerCase(),
      passwordHash,
      role:             'companyAdmin',
      subscriptionTier: 'locked',
      createdAt:        new Date(),
    }

    await users.insertOne(user)

    return res.status(201).json({ message: 'Account created successfully' })
  } catch (err) {
    console.error('[Auth] Signup error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/refresh', requireAuth, async (req, res) => {
  try {
    const users = await getCollection('users')
    const user = await users.findOne({ email: req.user.email })
    if (!user) {
      return res.status(401).json({ error: 'User not found' })
    }

    const token = jwt.sign(
      {
        userId:           user._id.toString(),
        companyId:        user.companyId.toString(),
        role:             user.role,
        subscriptionTier: user.subscriptionTier || 'entry',
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({ token })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const users = await getCollection('users')
    const user = await users.findOne(
      { _id: require('mongodb').ObjectId.createFromHexString(req.user.userId) },
      { projection: { passwordHash: 0 } }
    )
    if (!user) return res.status(404).json({ error: 'User not found' })
    return res.json(user)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router