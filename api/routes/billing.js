const express  = require('express')
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { getCollection }   = require('../db/mongo')
const { requireAuth }     = require('../middleware/auth')
const { requireCompany }  = require('../middleware/requireCompany')
const { ObjectId }        = require('mongodb')

const router      = express.Router()
const PRICE_ID    = process.env.STRIPE_PRICE_ID
const DASH_URL    = process.env.DASHBOARD_URL || 'https://track.clarity-software.com.au'

// GET /api/billing/status
router.get('/status', requireAuth, requireCompany, async (req, res) => {
  try {
    const companies = await getCollection('companies')
    const company   = await companies.findOne({ _id: new ObjectId(req.companyId) })
    const slots     = (company?.slots?.entrySlots || 0) +
                      (company?.slots?.midSlots   || 0) +
                      (company?.slots?.topSlots   || 0)
    return res.json({
      subscriptionStatus:   company?.subscriptionStatus   || 'inactive',
      stripeCustomerId:     company?.stripeCustomerId     || null,
      stripeSubscriptionId: company?.stripeSubscriptionId || null,
      billingMode:          company?.billingMode          || 'stripe',
      slots,
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/billing/checkout
router.post('/checkout', requireAuth, requireCompany, async (req, res) => {
  try {
    const { quantity = 1 } = req.body
    const session = await stripe.checkout.sessions.create({
      mode:                 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: PRICE_ID, quantity: parseInt(quantity) }],
      metadata:   { companyId: req.companyId },
      success_url: `${DASH_URL}/settings?tab=billing&success=true`,
      cancel_url:  `${DASH_URL}/settings?tab=billing&cancelled=true`,
    })
    return res.json({ url: session.url })
  } catch (err) {
    console.error('[Billing] Checkout error:', err.message)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
})

// POST /api/billing/portal
router.post('/portal', requireAuth, requireCompany, async (req, res) => {
  try {
    const companies = await getCollection('companies')
    const company   = await companies.findOne({ _id: new ObjectId(req.companyId) })
    if (!company?.stripeCustomerId) {
      return res.status(400).json({ error: 'No active subscription found' })
    }
    const session = await stripe.billingPortal.sessions.create({
      customer:   company.stripeCustomerId,
      return_url: `${DASH_URL}/settings?tab=billing`,
    })
    return res.json({ url: session.url })
  } catch (err) {
    console.error('[Billing] Portal error:', err.message)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
})

// POST /api/billing/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']
  let event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Billing] Webhook signature error:', err.message)
    return res.status(400).json({ error: err.message })
  }

  try {
    const companies = await getCollection('companies')

    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      if (s.metadata?.companyId) {
        await companies.updateOne(
          { _id: new ObjectId(s.metadata.companyId) },
          { $set: {
            stripeCustomerId:     s.customer,
            stripeSubscriptionId: s.subscription,
            subscriptionStatus:   'active',
            slots: { entrySlots: s.line_items?.data?.[0]?.quantity || 1, midSlots: 0, topSlots: 0 },
            updatedAt: new Date(),
          }}
        )
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const s = event.data.object
      await companies.updateOne(
        { stripeCustomerId: s.customer },
        { $set: {
          subscriptionStatus:   s.status === 'active' ? 'active' : 'inactive',
          stripeSubscriptionId: s.id,
          slots: { entrySlots: s.items?.data?.[0]?.quantity || 1, midSlots: 0, topSlots: 0 },
          updatedAt: new Date(),
        }}
      )
    }

    if (event.type === 'customer.subscription.deleted') {
      const s = event.data.object
      await companies.updateOne(
        { stripeCustomerId: s.customer },
        { $set: { subscriptionStatus: 'cancelled', updatedAt: new Date() } }
      )
    }

    if (event.type === 'invoice.payment_failed') {
      const s = event.data.object
      await companies.updateOne(
        { stripeCustomerId: s.customer },
        { $set: { subscriptionStatus: 'payment_failed', updatedAt: new Date() } }
      )
    }

    return res.json({ received: true })
  } catch (err) {
    console.error('[Billing] Webhook error:', err.message)
    return res.status(500).json({ error: 'Webhook processing failed' })
  }
})

module.exports = router