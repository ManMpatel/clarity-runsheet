import { pgTable, uuid, text, timestamp, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core'
import { users } from './users'

// No Mongo equivalent — new infrastructure for Phase 4's access/refresh token model.
// Refresh tokens are stored HASHED (sha256), never raw, so a DB read alone can't be replayed.
export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => ({
  userIdx: index('refresh_tokens_user_idx').on(t.userId),
}))

// Backs the new POST /api/v1/notifications/register-device endpoint + FCM/Expo push dispatch.
export const deviceTokens = pgTable('device_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  platform: text('platform').notNull(), // 'ios' | 'android' | 'web'
  token: text('token').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  userPlatformTokenIdx: uniqueIndex('device_tokens_upt_idx').on(t.userId, t.platform, t.token),
}))

// No Redis, so Idempotency-Key support (billing/trip mutating endpoints) lives here instead of
// an in-memory or Redis store — survives a process restart, which an in-memory map wouldn't.
export const idempotencyKeys = pgTable('idempotency_keys', {
  key: text('key').primaryKey(),
  userId: uuid('user_id').references(() => users.id),
  response: jsonb('response'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
