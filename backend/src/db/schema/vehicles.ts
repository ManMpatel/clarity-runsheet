import { pgEnum, pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { users } from './users'

export const tierEnum = pgEnum('vehicle_tier', ['entry', 'mid', 'top'])
export const immobiliseActionEnum = pgEnum('immobilise_action', ['cut', 'restore'])

export const vehicles = pgTable('vehicles', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  imei: text('imei').notNull().unique(),
  registration: text('registration'),
  make: text('make'),
  model: text('model'),
  year: integer('year'),
  driverMobile: text('driver_mobile'),
  tier: tierEnum('tier').notNull(),
  tierChangesRemaining: integer('tier_changes_remaining').notNull().default(0),
  active: boolean('active').notNull().default(true),
  immobilised: boolean('immobilised').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  companyIdx: index('vehicles_company_idx').on(t.companyId),
}))

export const vehicleTierHistory = pgTable('vehicle_tier_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  fromTier: tierEnum('from_tier'),
  toTier: tierEnum('to_tier').notNull(),
  changedAt: timestamp('changed_at', { withTimezone: true }).notNull().defaultNow(),
  changedBy: uuid('changed_by').references(() => users.id),
})

export const vehicleImmobiliseHistory = pgTable('vehicle_immobilise_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  action: immobiliseActionEnum('action').notNull(),
  triggeredBy: uuid('triggered_by').references(() => users.id),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
})
