const express = require('express')
const { ObjectId } = require('mongodb')
const { getCollection } = require('../db/mongo')
const { requireAuth, requireRole } = require('../middleware/auth')
const { requireCompany } = require('../middleware/requireCompany')

const router = express.Router()

router.get('/', requireAuth, requireCompany, async (req, res) => {
  try {
    const { vehicleId, status } = req.query
    const filter = { ...req.companyFilter }
    if (vehicleId) filter.vehicleId = vehicleId
    if (status)    filter.status = status

    const collection = await getCollection('maintenance')
    const records = await collection
      .find(filter)
      .sort({ dueDate: 1 })
      .toArray()
    return res.json(records)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', requireAuth, requireCompany,
  requireRole('companyAdmin', 'fleetManager', 'superAdmin'), async (req, res) => {
  try {
    const { vehicleId, type, dueDate, dueOdometer, notes } = req.body
    if (!vehicleId || !type) {
      return res.status(400).json({ error: 'Vehicle and type required' })
    }

    const collection = await getCollection('maintenance')
    const record = {
      companyId:   req.companyId,
      vehicleId,
      type,
      dueDate:     dueDate ? new Date(dueDate) : null,
      dueOdometer: dueOdometer || null,
      notes:       notes || null,
      status:      'pending',
      createdAt:   new Date(),
    }

    const result = await collection.insertOne(record)
    return res.status(201).json({ ...record, _id: result.insertedId })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.put('/:id/complete', requireAuth, requireCompany,
  requireRole('companyAdmin', 'fleetManager', 'superAdmin'), async (req, res) => {
  try {
    const { completedDate, notes, nextDueDate, nextDueOdometer } = req.body
    const collection = await getCollection('maintenance')

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id), ...req.companyFilter },
      {
        $set: {
          status:          'completed',
          completedDate:   completedDate ? new Date(completedDate) : new Date(),
          completionNotes: notes || null,
          nextDueDate:     nextDueDate ? new Date(nextDueDate) : null,
          nextDueOdometer: nextDueOdometer || null,
          updatedAt:       new Date(),
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) return res.status(404).json({ error: 'Record not found' })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

router.get('/due', requireAuth, requireCompany, async (req, res) => {
  try {
    const now = new Date()
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const collection = await getCollection('maintenance')
    const due = await collection
      .find({
        ...req.companyFilter,
        status:  'pending',
        dueDate: { $lte: nextWeek },
      })
      .sort({ dueDate: 1 })
      .toArray()

    return res.json(due)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router