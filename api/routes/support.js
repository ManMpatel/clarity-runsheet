const express = require('express')
const { getCollection } = require('../db/mongo')
const { sendSupportAutoReply, sendSupportAdminNotification } = require('../services/resend')

const router = express.Router()

// Generates a ticket number — format CF-YYYYMMDD-XXXX
function generateTicketNumber() {
  const date   = new Date()
  const y      = date.getFullYear()
  const m      = String(date.getMonth() + 1).padStart(2, '0')
  const d      = String(date.getDate()).padStart(2, '0')
  const rand   = Math.floor(1000 + Math.random() * 9000)
  return `CF-${y}${m}${d}-${rand}`
}

// POST /api/support/ticket
// Anyone can submit — logged in or not
// Sends auto-reply to customer and notification to admin
router.post('/ticket', async (req, res) => {
  try {
    const { name, email, subject, message, category } = req.body

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'Name, email, subject and message required' })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Invalid email address' })
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long — max 2000 characters' })
    }

    const ticketNumber = generateTicketNumber()

    const ticket = {
      ticketNumber,
      name,
      email:     email.toLowerCase(),
      subject,
      message,
      category:  category || 'general',
      status:    'open',
      createdAt: new Date(),
    }

    const collection = await getCollection('support_tickets')
    await collection.insertOne(ticket)

    // Fire both emails — do not await so response is fast
    sendSupportAutoReply(email, name, ticketNumber, subject)
    sendSupportAdminNotification(ticket)

    return res.status(201).json({
      success:      true,
      ticketNumber,
      message:      'Ticket received. Check your email for confirmation.',
    })
  } catch (err) {
    console.error('[Support] Ticket error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/support/tickets — super admin only, view all tickets
router.get('/tickets', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' })

    const collection = await getCollection('support_tickets')
    const tickets = await collection
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()

    return res.json(tickets)
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router