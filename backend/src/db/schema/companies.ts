import { pgEnum, pgTable, uuid, text, boolean, integer, numeric, timestamp } from 'drizzle-orm/pg-core'

export const subscriptionTierEnum = pgEnum('subscription_tier', ['locked', 'entry', 'mid', 'top'])
export const accountTypeEnum = pgEnum('account_type', ['individual', 'contractor', 'garage_owner'])
export const billingModeEnum = pgEnum('billing_mode', ['stripe', 'becs', 'manual'])
export const subscriptionStatusEnum = pgEnum('subscription_status', ['inactive', 'active', 'cancelled', 'payment_failed'])

// NOTE: `role` ('contractor'/'garageOwner') KEPT despite looking redundant with `accountType` —
// verification found a live superadmin endpoint (PUT /companies/:id/set-role) that writes it
// independently, so dropping it would be a guess about intent, not a mechanical cleanup. Its only
// frontend read (old Sidebar.jsx's `role === 'garageOwner'` check) turned out to be dead code
// comparing the wrong field (that's the *user's* role, never 'garageOwner') — `accountType` is
// what actually drives the garage-owner UI. Flagged to the user; not unwired further here.
export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('locked'),
  entrySlots: integer('entry_slots').notNull().default(0),
  midSlots: integer('mid_slots').notNull().default(0),
  topSlots: integer('top_slots').notNull().default(0),
  active: boolean('active').notNull().default(true),
  onboardingComplete: boolean('onboarding_complete').notNull().default(false),
  accountType: accountTypeEnum('account_type').notNull().default('contractor'),
  // Distinct from accountType — see note above. Free-text (not enum) since its value domain
  // ('contractor'/'garageOwner', legacy camelCase) is set only via the superadmin endpoint.
  role: text('role'),
  billingMode: billingModeEnum('billing_mode').notNull().default('manual'),
  customPrice: numeric('custom_price', { precision: 10, scale: 2 }),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  subscriptionStatus: subscriptionStatusEnum('subscription_status'),
  phone: text('phone'),
  address: text('address'),
  timezone: text('timezone'),
  abn: text('abn'),
  website: text('website'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
