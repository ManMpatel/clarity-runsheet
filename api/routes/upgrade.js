const express = require('express')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')
const { ObjectId } = require('mongodb')

const router = express.Router()

router.post('/request', requireAuth, requireCompany, async (req, res) => {
  try {
    const { entrySlots, midSlots, topSlots, message } = req.body

    const collection = await getCollection('upgrade_requests')
    const companies  = await getCollection('companies')
    const company    = await companies.findOne({ _id: new ObjectId(req.companyId) })

    const request = {
      companyId:   req.companyId,
      companyName: company?.name || req.companyId,
      requestedBy: req.user.userId,
      entrySlots:  parseInt(entrySlots) || 0,
      midSlots:    parseInt(midSlots)   || 0,
      topSlots:    parseInt(topSlots)   || 0,
      message:     message || '',
      status:      'pending',
      createdAt:   new Date(),
    }

    await collection.insertOne(request)
    return res.status(201).json(request)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/my-requests', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('upgrade_requests')
    const requests = await collection
      .find({ companyId: req.companyId })
      .sort({ createdAt: -1 })
      .toArray()
    return res.json(requests)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
