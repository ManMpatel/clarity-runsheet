const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, from, to, classification } = req.query
    const filter = { ...req.companyFilter }
    if (vehicleId)      filter.vehicleId = vehicleId
    if (classification) filter.classification = classification
    if (from && to) {
      filter.startTime = { $gte: new Date(from), $lte: new Date(to) }
    }

    const collection = await getCollection('trips')
    const trips = await collection
      .find(filter)
      .sort({ startTime: -1 })
      .toArray()

    return res.json(trips)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/classify', requireAuth, requireCompany, async (req, res) => {
  try {
    const { classification, purpose } = req.body
    if (!['business', 'personal'].includes(classification)) {
      return res.status(400).json({ error: 'classification must be business or personal' })
    }

    const collection = await getCollection('trips')
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      {
        $set: {
          classification,
          purpose:      purpose || null,
          classifiedAt: new Date(),
          classifiedBy: req.user.userId,
          updatedAt:    new Date(),
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) return res.status(404).json({ error: 'Trip not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/summary', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, year } = req.query
    const startYear = parseInt(year) || new Date().getFullYear()
    const from = new Date(`${startYear}-04-01`)
    const to   = new Date(`${startYear + 1}-03-31`)

    const collection = await getCollection('trips')
    const filter = {
      ...req.companyFilter,
      startTime: { $gte: from, $lte: to },
    }
    if (vehicleId) filter.vehicleId = vehicleId

    const trips = await collection.find(filter).toArray()

    const summary = {
      totalTrips:        trips.length,
      businessTrips:     trips.filter(t => t.classification === 'business').length,
      personalTrips:     trips.filter(t => t.classification === 'personal').length,
      unclassifiedTrips: trips.filter(t => !t.classification).length,
      businessKm:        trips.filter(t => t.classification === 'business')
                              .reduce((sum, t) => sum + (t.distanceKm || 0), 0),
      personalKm:        trips.filter(t => t.classification === 'personal')
                              .reduce((sum, t) => sum + (t.distanceKm || 0), 0),
      financialYear:     `${startYear}-${startYear + 1}`,
    }

    return res.json(summary)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/fbt/settings
// Returns business hours setting for this company
router.get('/settings', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('fbt_settings')
    const settings = await collection.findOne({ companyId: req.companyId })

    if (!settings) {
      return res.json({
        companyId:     req.companyId,
        businessHours: { start: '07:00', end: '18:00' },
        businessDays:  [1, 2, 3, 4, 5],
        mode:          'auto',
      })
    }

    return res.json(settings)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/fbt/settings
// Contractor sets business hours once — all trips auto-classified from this point
// mode: 'auto' = classify by hours, 'all_business' = everything is business
router.put('/settings', requireAuth, requireCompany, async (req, res) => {
  try {
    const { businessHours, businessDays, mode } = req.body

    if (!businessHours?.start || !businessHours?.end) {
      return res.status(400).json({ error: 'businessHours.start and end required' })
    }

    const collection = await getCollection('fbt_settings')
    const settings = {
      companyId:     req.companyId,
      businessHours: { start: businessHours.start, end: businessHours.end },
      businessDays:  businessDays || [1, 2, 3, 4, 5],
      mode:          mode || 'auto',
      updatedAt:     new Date(),
    }

    await collection.updateOne(
      { companyId: req.companyId },
      { $set: settings },
      { upsert: true }
    )

    return res.json(settings)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router