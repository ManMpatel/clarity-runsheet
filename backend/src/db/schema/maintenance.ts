import { pgEnum, pgTable, uuid, text, date, integer, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

export const maintenanceStatusEnum = pgEnum('maintenance_status', ['pending', 'completed'])

export const maintenance = pgTable('maintenance', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  type: text('type').notNull(),
  dueDate: date('due_date'),
  dueOdometer: integer('due_odometer'),
  notes: text('notes'),
  status: maintenanceStatusEnum('status').notNull().default('pending'),
  completedDate: date('completed_date'),
  completionNotes: text('completion_notes'),
  nextDueDate: date('next_due_date'),
  nextDueOdometer: integer('next_due_odometer'),
  // NEW — replaces the old Redis `maintenance:notified:{id}` 24h dedup key for the daily cron
  // (worker/cron/maintenance-flags.js). A persisted column survives ingestion restarts, unlike
  // the alert-cooldown/geofence-debounce state which stays in-memory (see ingestion/state.ts).
  lastFlaggedAt: timestamp('last_flagged_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
