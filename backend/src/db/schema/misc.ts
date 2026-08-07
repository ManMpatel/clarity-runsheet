import { pgEnum, pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const upgradeRequestStatusEnum = pgEnum('upgrade_request_status', ['pending', 'approved', 'rejected'])

export const upgradeRequests = pgTable('upgrade_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  companyName: text('company_name').notNull(),
  requestedBy: text('requested_by').notNull(),
  entrySlots: integer('entry_slots').notNull().default(0),
  midSlots: integer('mid_slots').notNull().default(0),
  topSlots: integer('top_slots').notNull().default(0),
  message: text('message'),
  status: upgradeRequestStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  actionedAt: timestamp('actioned_at', { withTimezone: true }),
})

export const devices = pgTable('devices', {
  id: uuid('id').primaryKey().defaultRandom(),
  // NEW constraint — the old code claimed a unique index existed (checked for Mongo error 11000
  // on insert) but none was ever created in api/db/setup.js. Real gap, fixed here.
  imei: text('imei').notNull().unique(),
  deviceType: text('device_type').notNull().default('FMC920'),
  registeredByCompanyId: uuid('registered_by_company_id').references(() => companies.id),
  customerId: text('customer_id'),
  subscriptionStatus: text('subscription_status'),
  notes: text('notes'),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  garageCompanyId: uuid('garage_company_id').notNull().references(() => companies.id),
  amount: integer('amount').notNull(),
  period: text('period').notNull(),
  note: text('note'),
  settledAt: timestamp('settled_at', { withTimezone: true }).notNull().defaultNow(),
})

export const supportTickets = pgTable('support_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketNumber: text('ticket_number').notNull().unique(), // format 'CF-YYYYMMDD-XXXX'
  name: text('name').notNull(),
  email: text('email').notNull(),
  subject: text('subject').notNull(),
  message: text('message').notNull(),
  category: text('category').notNull().default('general'),
  status: text('status').notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// NEW — backs Phase 4's async report generation (POST /api/v1/reports + polling GET),
// replacing api/services/reports-queue.js's console.log stub.
export const reportJobStatusEnum = pgEnum('report_job_status', ['pending', 'running', 'done', 'failed'])

export const reportJobs = pgTable('report_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: text('type').notNull(), // 'driver-scores' | 'fuel-idle' | 'trip-summary' | 'vehicle-health'
  status: reportJobStatusEnum('status').notNull().default('pending'),
  resultUrl: text('result_url'),
  error: text('error'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
})
