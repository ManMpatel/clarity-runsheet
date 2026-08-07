const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireSuperAdmin } = require('../middleware/superAdmin')

const router = express.Router()

const TIER_RATES = { entry: 18, mid: 25, top: 45 }
const COMMISSION = 0.10

// GET /api/referrals/summary — garage owner sees their earnings
router.get('/summary', requireAuth, async (req, res) => {
  try {
    const devices     = await getCollection('devices')
    const vehicles    = await getCollection('vehicles')
    const settlements = await getCollection('settlements')

    const linked = await devices
      .find({ registeredByCompanyId: req.companyId, customerId: { $ne: null } })
      .toArray()

    const deviceDetails = await Promise.all(linked.map(async (d) => {
      const vehicle = await vehicles.findOne({ imei: d.imei, active: true })
      const tier     = vehicle?.tier || 'entry'
      const monthly  = TIER_RATES[tier] || 18
      return {
        imei:       d.imei,
        deviceType: d.deviceType,
        tier,
        monthly,
        commission: +(monthly * COMMISSION).toFixed(2),
      }
    }))

    const monthlyTotal = deviceDetails.reduce((s, d) => s + d.commission, 0)

    const settled = await settlements.aggregate([
      { $match: { garageCompanyId: req.companyId } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).toArray()

    return res.json({
      activeDevices:     linked.length,
      monthlyCommission: +monthlyTotal.toFixed(2),
      totalEarned:       settled[0]?.total || 0,
      devices:           deviceDetails,
    })
  } catch (err) {
    console.error('[Referrals] Summary error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/referrals/settlements — garage owner payout history
router.get('/settlements', requireAuth, async (req, res) => {
  try {
    const settlements = await getCollection('settlements')
    const list = await settlements
      .find({ garageCompanyId: req.companyId })
      .sort({ settledAt: -1 })
      .toArray()
    return res.json(list)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/referrals/admin/all — super admin sees all garages
router.get('/admin/all', requireSuperAdmin, async (req, res) => {
  try {
    const companies   = await getCollection('companies')
    const devices     = await getCollection('vehicles')
    const allDevices  = await getCollection('devices')
    const settlements = await getCollection('settlements')

    const garages = await companies.find({ accountType: 'garageOwner' }).toArray()

    const result = await Promise.all(garages.map(async (g) => {
      const linked = await allDevices
        .find({ registeredByCompanyId: g._id.toString(), customerId: { $ne: null } })
        .toArray()

      let monthly = 0
      for (const d of linked) {
        const v = await devices.findOne({ imei: d.imei, active: true })
        monthly += TIER_RATES[v?.tier || 'entry'] * COMMISSION
      }

      const settled = await settlements.aggregate([
        { $match: { garageCompanyId: g._id.toString() } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]).toArray()

      return {
        _id:           g._id,
        name:          g.name,
        email:         g.email,
        activeDevices: linked.length,
        monthly:       +monthly.toFixed(2),
        totalSettled:  settled[0]?.total || 0,
      }
    }))

    return res.json(result)
  } catch (err) {
    console.error('[Referrals] Admin all error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/referrals/admin/:garageId/settle — record a payout
router.post('/admin/:garageId/settle', requireSuperAdmin, async (req, res) => {
  try {
    const { amount, period, note } = req.body
    if (!amount || !period) {
      return res.status(400).json({ error: 'Amount and period required' })
    }

    const settlements = await getCollection('settlements')
    const record = {
      garageCompanyId: req.params.garageId,
      amount:          parseFloat(amount),
      period,
      note:            note || '',
      settledAt:       new Date(),
    }

    await settlements.insertOne(record)
    return res.status(201).json({ success: true, record })
  } catch (err) {
    console.error('[Referrals] Settle error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router