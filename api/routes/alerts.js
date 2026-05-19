const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const { type, severity, read, page = 1, limit = 20 } = req.query

    const filter = { ...req.companyFilter }
    if (type)     filter.type = type
    if (severity) filter.severity = severity
    if (read !== undefined) filter.read = read === 'true'

    const collection = await getCollection('alerts')
    const total = await collection.countDocuments(filter)
    const alerts = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .toArray()

    const unread = await collection.countDocuments({
      ...req.companyFilter,
      read: false,
    })

    return res.json({ alerts, total, unread, page: parseInt(page) })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/read', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('alerts')
    await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      { $set: { read: true, readAt: new Date() } }
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/read-all', requireAuth, requireCompany, async (req, res) => {
  try {
    const collection = await getCollection('alerts')
    await collection.updateMany(
      { ...req.companyFilter, read: false },
      { $set: { read: true, readAt: new Date() } }
    )
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router