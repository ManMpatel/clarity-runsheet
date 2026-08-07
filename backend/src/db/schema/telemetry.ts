import { pgTable, timestamp, text, uuid, doublePrecision, integer, smallint, boolean, numeric, jsonb } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

// This table is created by the hand-written migration in
// backend/src/db/migrations/0001_telemetry_hypertable.sql (create_hypertable, retention policy,
// compression policy, PostGIS-adjacent index) — Drizzle can't express TimescaleDB DDL, so this
// declaration exists purely for query typing, not as the source of truth for the table's DDL.
// Do not run `drizzle-kit push`/`generate` migrations against this table without excluding it,
// or it'll try to "fix" it back into a plain table.
export const telemetry = pgTable('telemetry', {
  time: timestamp('time', { withTimezone: true }).notNull(),
  imei: text('imei').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id, { onDelete: 'cascade' }),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  altitude: integer('altitude'),
  angle: smallint('angle'),
  satellites: smallint('satellites'),
  speed: smallint('speed'),
  priority: smallint('priority'),
  ignition: boolean('ignition'),
  movement: boolean('movement'),
  odometer: integer('odometer'),
  // Fixed from the old Mongo shape, which stored these as strings via .toFixed(2).
  externalVoltage: numeric('external_voltage', { precision: 6, scale: 2 }),
  batteryVoltage: numeric('battery_voltage', { precision: 6, scale: 2 }),
  engineRpm: integer('engine_rpm'),
  engineLoad: smallint('engine_load'),
  coolantTemp: smallint('coolant_temp'),
  fuelLevel: smallint('fuel_level'),
  gsmSignal: smallint('gsm_signal'),
  dtcCount: smallint('dtc_count'),
  crashDetection: boolean('crash_detection'),
  greenDrivingType: text('green_driving_type'),
  greenDrivingValue: numeric('green_driving_value'),
  extras: jsonb('extras'), // was rawIo
})
