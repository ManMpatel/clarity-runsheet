import { pgTable, uuid, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { companies, subscriptionTierEnum } from './companies'

// DECISION: the old separate `super_admins` Mongo collection has been merged into `users`
// (role='superAdmin', companyId nullable) rather than kept as its own table. The target schema
// sketch put totp_secret directly on `users`, which only makes sense under a merged model — a
// separate realm would keep TOTP fields on its own table instead. This does change the current
// two-realm auth design (admin-auth.ts's TOTP flow now queries `users` with role='superAdmin'
// instead of a `super_admins` collection), flagged in the migration summary for confirmation.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').references(() => companies.id), // nullable: superAdmin users have none
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash'),
  role: text('role').notNull().default('user'), // 'companyAdmin' | 'fleetManager' | 'user' | 'superAdmin' | ...
  subscriptionTier: subscriptionTierEnum('subscription_tier'),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerifyToken: text('email_verify_token'),
  emailVerifyExpiry: timestamp('email_verify_expiry', { withTimezone: true }),
  driverConsentGiven: boolean('driver_consent_given').notNull().default(false),
  driverConsentGivenAt: timestamp('driver_consent_given_at', { withTimezone: true }),
  driverConsentIp: text('driver_consent_ip'),
  googleId: text('google_id'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry', { withTimezone: true }),
  pushToken: text('push_token'), // legacy Expo token column; superseded by device_tokens table, kept for now
  totpSecret: text('totp_secret'), // superAdmin only, mirrors old super_admins.totpSecret
  totpConfiguredAt: timestamp('totp_configured_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  companyIdx: index('users_company_idx').on(t.companyId),
}))
