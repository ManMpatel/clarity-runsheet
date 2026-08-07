import { pgEnum, pgTable, uuid, text, timestamp, doublePrecision, smallint, numeric, index } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

export const driverEventTypeEnum = pgEnum('driver_event_type', [
  'crash', 'harshBraking', 'harshAcceleration', 'harshCornering', 'speeding',
])

export const driverEvents = pgTable('driver_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: driverEventTypeEnum('type').notNull(),
  imei: text('imei').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  speed: smallint('speed'),
  severity: numeric('severity'), // crash only
  value: numeric('value'), // green-driving only
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // NEW — queried by companyId+vehicleId+timestamp range (safety-scores cron) with no index before.
  companyVehicleTimeIdx: index('driver_events_cvt_idx').on(t.companyId, t.vehicleId, t.timestamp),
}))
