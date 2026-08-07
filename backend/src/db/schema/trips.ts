import { sql } from 'drizzle-orm'
import { pgEnum, pgTable, uuid, text, integer, smallint, numeric, timestamp, index, doublePrecision } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'
import { drivers } from './drivers'

export const classificationEnum = pgEnum('trip_classification', ['business', 'personal'])

// start/end location stored as plain lat/lng (not PostGIS geometry) — trips don't need spatial
// queries (ST_Contains etc.), only geofences do. Keeps trip reads simple.
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  imei: text('imei').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  driverId: uuid('driver_id').references(() => drivers.id),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }),
  startLat: doublePrecision('start_lat'),
  startLng: doublePrecision('start_lng'),
  endLat: doublePrecision('end_lat'),
  endLng: doublePrecision('end_lng'),
  distanceKm: numeric('distance_km', { precision: 8, scale: 2 }),
  durationMinutes: integer('duration_minutes'),
  maxSpeed: smallint('max_speed'),
  classification: classificationEnum('classification'),
  purpose: text('purpose'),
  classifiedAt: timestamp('classified_at', { withTimezone: true }),
  classifiedBy: text('classified_by'), // 'auto' | a userId string
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // NEW — no index existed in Mongo despite constant companyId/vehicleId/startTime queries.
  companyStartIdx: index('trips_company_start_idx').on(t.companyId, t.startTime),
  vehicleStartIdx: index('trips_vehicle_start_idx').on(t.vehicleId, t.startTime),
  // Partial index backing the active-trip lookup (`WHERE vehicle_id = $1 AND end_time IS NULL`)
  // that replaces the old Redis-cached active-trip state in ingestion's trip-builder.
  activeTripIdx: index('trips_active_idx').on(t.vehicleId).where(sql`end_time IS NULL`),
}))
