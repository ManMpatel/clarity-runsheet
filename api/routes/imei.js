const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

// GET /api/imei/check?imei=123456789012345
// Garage owner types IMEI before installation
// Returns status — unregistered, registered_to_you, registered_to_other
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
      return res.json({
        status: 'unregistered',
        message: 'Device is available to register',
      })
    }

    if (device.registeredByCompanyId === req.companyId) {
      return res.json({
        status: 'registered_to_you',
        message: 'Already registered to your account',
        imei: device.imei,
        registeredAt: device.registeredAt,
      })
    }

    return res.json({
      status: 'registered_to_other',
      message: 'This IMEI is already registered to another account',
    })
  } catch (err) {
    console.error('[IMEI] Check error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

