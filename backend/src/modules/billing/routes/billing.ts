// Ported from api/routes/billing.js. Fixes the Phase 6 bug: the webhook handler unconditionally
// reset midSlots/topSlots to 0 on every subscription update, using only line_items[0]'s quantity
// for entrySlots. Any company that had mid/top slots granted manually via the admin panel
// (PUT /api/v1/admin/companies/:id/slots) would have them silently wiped by the next unrelated
// Stripe event.
//
// Fix: slot counts are now derived additively/idempotently from the subscription's ACTUAL line
// items via a price-ID -> tier map (env-configured, see .env.example — the old code only ever
// created checkout sessions for a single price, so 'entry' is the only tier this webhook has
// ever been authoritative over in practice). Critically, the webhook now NEVER writes
// entrySlots/midSlots/topSlots for non-Stripe (billingMode !== 'stripe') companies, and only
// overwrites the slot tiers it actually has data for from the subscription's line items — a
// company's manually-granted mid/top slots are never touched by a Stripe event about a
// different tier.
import express from 'express'
import Stripe from 'stripe'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { companies } from '../../../db/schema'
import { requireAuth, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

// Stripe billing is optional in dev/self-hosted setups — constructing the client eagerly with an
// empty key throws at import time and takes the whole API process down, so only instantiate it
// when a key is actually configured; routes below fail gracefully instead.
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null
const router = express.Router()
const PRICE_ID = process.env.STRIPE_PRICE_ID
const WEB_URL = process.env.WEB_URL || process.env.DASHBOARD_URL || 'https://track.clarity-software.com.au'

// Price-ID -> tier map. Only entries actually configured are trusted — an unmapped price ID's
// quantity is ignored rather than guessed into a tier, which is the safer failure mode.
const PRICE_TIER_MAP: Record<string, 'entry' | 'mid' | 'top'> = {}
if (process.env.STRIPE_PRICE_ID_ENTRY) PRICE_TIER_MAP[process.env.STRIPE_PRICE_ID_ENTRY] = 'entry'
if (process.env.STRIPE_PRICE_ID_MID) PRICE_TIER_MAP[process.env.STRIPE_PRICE_ID_MID] = 'mid'
if (process.env.STRIPE_PRICE_ID_TOP) PRICE_TIER_MAP[process.env.STRIPE_PRICE_ID_TOP] = 'top'
// The old single-PRICE_ID checkout flow (below) predates the multi-tier map — treat it as 'entry'
// too, so existing subscriptions created before STRIPE_PRICE_ID_ENTRY was configured still resolve.
if (PRICE_ID) PRICE_TIER_MAP[PRICE_ID] = PRICE_TIER_MAP[PRICE_ID] || 'entry'

router.get('/status', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const [company] = await db.select().from(companies).where(eq(companies.id, req.companyId!)).limit(1)
  const slots = (company?.entrySlots || 0) + (company?.midSlots || 0) + (company?.topSlots || 0)

  return res.success({
    subscriptionStatus: company?.subscriptionStatus || 'inactive',
    stripeCustomerId: company?.stripeCustomerId || null,
    stripeSubscriptionId: company?.stripeSubscriptionId || null,
    billingMode: company?.billingMode || 'stripe',
    slots,
  })
}))

router.post('/checkout', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  if (!stripe) return res.fail(null, 'Billing is not configured', 503)
  const { quantity = 1 } = req.body
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: PRICE_ID, quantity: parseInt(quantity, 10) }],
    metadata: { companyId: req.companyId! },
    success_url: `${WEB_URL}/settings?tab=billing&success=true`,
    cancel_url: `${WEB_URL}/settings?tab=billing&cancelled=true`,
  })
  return res.success({ url: session.url })
}))

router.post('/portal', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  if (!stripe) return res.fail(null, 'Billing is not configured', 503)
  const [company] = await db.select().from(companies).where(eq(companies.id, req.companyId!)).limit(1)
  if (!company?.stripeCustomerId) return res.fail(null, 'No active subscription found')

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${WEB_URL}/settings?tab=billing`,
  })
  return res.success({ url: session.url })
}))

// Sums a Stripe subscription's line-item quantities by mapped tier. Unmapped price IDs are
// ignored (not guessed) — returns null for a tier the webhook has no data for, so the caller
// knows NOT to write that column, distinct from "write it as zero".
function slotCountsFromSubscription(items: Stripe.LineItem[] | Stripe.SubscriptionItem[]): Partial<Record<'entry' | 'mid' | 'top', number>> {
  const counts: Partial<Record<'entry' | 'mid' | 'top', number>> = {}
  for (const item of items) {
    const priceId = (item as any).price?.id
    const tier = priceId ? PRICE_TIER_MAP[priceId] : undefined
    if (!tier) continue
    counts[tier] = (counts[tier] || 0) + (item.quantity ?? 0)
  }
  return counts
}

async function applySlotCounts(companyId: string, counts: Partial<Record<'entry' | 'mid' | 'top', number>>, extraFields: Record<string, unknown> = {}) {
  const [company] = await db.select().from(companies).where(eq(companies.id, companyId)).limit(1)
  if (!company) return
  // Never let a Stripe event about a subscription clobber a manually-managed (non-Stripe)
  // company's slots.
  if (company.billingMode !== 'stripe') {
    if (Object.keys(extraFields).length > 0) {
      await db.update(companies).set(extraFields as any).where(eq(companies.id, companyId))
    }
    return
  }

  const update: Record<string, unknown> = { ...extraFields, updatedAt: new Date() }
  // Only write the tiers this webhook actually has data for — omitted tiers are left untouched,
  // this is the additive/idempotent fix for the original slot-zeroing bug.
  if (counts.entry !== undefined) update.entrySlots = counts.entry
  if (counts.mid !== undefined) update.midSlots = counts.mid
  if (counts.top !== undefined) update.topSlots = counts.top

  await db.update(companies).set(update).where(eq(companies.id, companyId))
}

router.post('/webhook', express.raw({ type: 'application/json' }), asyncRoute(async (req, res) => {
  if (!stripe) return res.fail(null, 'Billing is not configured', 503)
  const sig = req.headers['stripe-signature'] as string
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[Billing] Webhook signature error:', err.message)
    return res.fail(null, err.message, 400)
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session
    if (s.metadata?.companyId) {
      const lineItems = s.line_items?.data ?? []
      const counts = slotCountsFromSubscription(lineItems)
      await applySlotCounts(s.metadata.companyId, counts, {
        stripeCustomerId: s.customer as string,
        stripeSubscriptionId: s.subscription as string,
        subscriptionStatus: 'active',
      })
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const s = event.data.object as Stripe.Subscription
    const [company] = await db.select().from(companies).where(eq(companies.stripeCustomerId, s.customer as string)).limit(1)
    if (company) {
      const counts = slotCountsFromSubscription(s.items.data)
      await applySlotCounts(company.id, counts, {
        subscriptionStatus: s.status === 'active' ? 'active' : 'inactive',
        stripeSubscriptionId: s.id,
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const s = event.data.object as Stripe.Subscription
    await db.update(companies).set({ subscriptionStatus: 'cancelled', updatedAt: new Date() })
      .where(eq(companies.stripeCustomerId, s.customer as string))
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice
    await db.update(companies).set({ subscriptionStatus: 'payment_failed', updatedAt: new Date() })
      .where(eq(companies.stripeCustomerId, invoice.customer as string))
  }

  return res.success({ received: true })
}))

export default router
