import { pgEnum, pgTable, uuid, text, boolean, timestamp, doublePrecision, index, uniqueIndex, smallint, numeric } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

export const alertTypeEnum = pgEnum('alert_type', [
  'afterHours', 'speeding', 'engineFault', 'lowBattery', 'geofenceBreach',
  'towing', 'crash', 'harshBraking', 'harshAcceleration', 'harshCornering',
  'maintenanceDue',
])
export const alertSeverityEnum = pgEnum('alert_severity', ['critical', 'warning', 'info'])

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: alertTypeEnum('type').notNull(),
  imei: text('imei'), // nullable — maintenanceDue alerts have no imei
  companyId: uuid('company_id').notNull().references(() => companies.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  message: text('message').notNull(),
  severity: alertSeverityEnum('severity').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  lat: doublePrecision('lat'), // nullable, absent on maintenanceDue alerts
  lng: doublePrecision('lng'),
  read: boolean('read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  companyCreatedIdx: index('alerts_company_created_idx').on(t.companyId, t.createdAt.desc()),
  companyReadIdx: index('alerts_company_read_idx').on(t.companyId, t.read),
}))

export const alertRules = pgTable('alert_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  type: alertTypeEnum('type').notNull(),
  active: boolean('active').notNull().default(true),
  speedLimit: smallint('speed_limit'),
  voltageThreshold: numeric('voltage_threshold'),
  smsNumber: text('sms_number'),
  // DEAD FIELD today — referenced in worker/processors/alerts.js's geofenceBreach check but never
  // actually written anywhere. Shipped nullable/unwired (preserves current behavior) rather than
  // guessing at a geofence-scoped-alert-rules feature that was never built. Flagged for the user.
  zoneId: uuid('zone_id'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // NEW — upserted as a natural {companyId,type} key in Mongo with no DB-level guarantee.
  companyTypeIdx: uniqueIndex('alert_rules_company_type_idx').on(t.companyId, t.type),
}))
