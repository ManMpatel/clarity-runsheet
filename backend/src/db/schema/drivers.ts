import { pgTable, uuid, text, boolean, date, timestamp, index } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

export const drivers = pgTable('drivers', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  email: text('email'),
  mobile: text('mobile'),
  licenceNumber: text('licence_number'),
  licenceExpiry: date('licence_expiry'),
  vehicleId: uuid('vehicle_id').references(() => vehicles.id),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  companyIdx: index('drivers_company_idx').on(t.companyId),
}))

// Append-only assignment log — never deleted, matches old Mongo driver_history semantics.
export const driverHistory = pgTable('driver_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  driverName: text('driver_name').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }),
})
