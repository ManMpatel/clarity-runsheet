// Ported from api/routes/support.js. Straightforward Mongo-to-Postgres translation.
import express from 'express'
import { desc } from 'drizzle-orm'
import { db } from '../../../db/client'
import { supportTickets } from '../../../db/schema'
import { requireSuperAdmin } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { sendSupportAutoReply, sendSupportAdminNotification } from '../../notifications/email'

const router = express.Router()

// Generates a ticket number — format CF-YYYYMMDD-XXXX
function generateTicketNumber() {
  const date = new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `CF-${y}${m}${d}-${rand}`
}

// POST /api/support/ticket
// Anyone can submit — logged in or not
// Sends auto-reply to customer and notification to admin
router.post('/ticket', asyncRoute(async (req, res) => {
  const { name, email, subject, message, category } = req.body

  if (!name || !email || !subject || !message) {
    return res.fail(null, 'Name, email, subject and message required')
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.fail(null, 'Invalid email address')
  }

  if (message.length > 2000) {
    return res.fail(null, 'Message too long — max 2000 characters')
  }

  const ticketNumber = generateTicketNumber()

  const [ticket] = await db.insert(supportTickets).values({
    ticketNumber,
    name,
    email: email.toLowerCase(),
    subject,
    message,
    category: category || 'general',
    status: 'open',
  }).returning()

  // Fire both emails — do not await so response is fast
  sendSupportAutoReply(email, name, ticketNumber, subject)
  sendSupportAdminNotification(ticket)

  return res.success({
    ticketNumber,
  }, 'Ticket received. Check your email for confirmation.')
}))

// GET /api/support/tickets — super admin only, view all tickets
router.get('/tickets', requireSuperAdmin, asyncRoute(async (req, res) => {
  const tickets = await db.select().from(supportTickets)
    .orderBy(desc(supportTickets.createdAt))
    .limit(100)

  return res.success(tickets)
}))

export default router
