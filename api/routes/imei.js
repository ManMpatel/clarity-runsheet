const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/imei/check?imei=123456789012345
router.get('/check', requireAuth, async (req, res) => {
  try {
    const { imei } = req.query

    if (!imei) {
      return res.status(400).json({ error: 'IMEI required' })
    }

    if (!/^\d{15}$/.test(imei)) {
      return res.status(400).json({ error: 'IMEI must be exactly 15 digits' })
    }

    const devices = await getCollection('devices')
    const device = await devices.findOne({ imei })

    if (!device) {
      return res.json({ status: 'unregistered', message: 'Device is available to register' })
    }

    if (device.registeredByCompanyId === req.companyId) {
      return res.json({
        status:       'registered_to_you',
        message:      'Already registered to your account',
        imei:         device.imei,
        registeredAt: device.registeredAt,
      })
    }

    return res.json({
      status:  'registered_to_other',
      message: 'This IMEI is already registered to another account',
    })
  } catch (err) {
    console.error('[IMEI] Check error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/imei/register
// Garage registers IMEI before installation — locks commission to their companyId
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { imei, deviceType, notes } = req.body

    if (!imei) {
      return res.status(400).json({ error: 'IMEI required' })
    }

    if (!/^\d{15}$/.test(imei)) {
      return res.status(400).json({ error: 'IMEI must be exactly 15 digits' })
    }

    const devices = await getCollection('devices')

    // Race condition protection — unique index on imei field handles this
    const existing = await devices.findOne({ imei })
    if (existing) {
      return res.status(409).json({ error: 'IMEI already registered' })
    }

    const device = {
      imei,
      deviceType:             deviceType || 'FMC920',
      registeredByCompanyId:  req.companyId,
      customerId:             null,
      subscriptionStatus:     'pending',
      notes:                  notes || '',
      registeredAt:           new Date(),
      updatedAt:              new Date(),
    }

    await devices.insertOne(device)

    return res.status(201).json({
      success: true,
      message: 'Device registered successfully',
      imei,
      registeredAt: device.registeredAt,
    })
  } catch (err) {
    // MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({ error: 'IMEI already registered' })
    }
    console.error('[IMEI] Register error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/imei/my-devices
// Garage owner sees all devices they have registered
router.get('/my-devices', requireAuth, async (req, res) => {
  try {
    const devices = await getCollection('devices')
    const list = await devices
      .find({ registeredByCompanyId: req.companyId })
      .sort({ registeredAt: -1 })
      .toArray()

    return res.json(list)
  } catch (err) {
    console.error('[IMEI] My devices error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router