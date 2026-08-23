import { pgEnum, pgTable, uuid, timestamp, doublePrecision, smallint, boolean, integer, text, date, numeric } from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

export const vehicleStatusEnum = pgEnum('vehicle_status', ['moving', 'idle', 'stopped'])

// One row per vehicle, upserted in place on every telemetry packet. Replaces the old
// Redis `van:state:{imei}` cache — this is now the single source of truth for "where is
// this vehicle right now", read directly by the API (no more Redis in the read path).
//
// Extended beyond the minimal {lat,lng,speed,ignition,odometer} shape sketched in the original
// spec: the old enrichment.js also derived `status` (moving/idle/stopped), `stateChangedAt`
// (since-timer), `todayKm` (delta from midnight odometer), and a reverse-geocoded `address` —
// live-map UI (VanSidePanel etc.) depends on these, so they're carried forward as real columns
// rather than silently dropped.
export const vehicleState = pgTable('vehicle_state', {
  vehicleId: uuid('vehicle_id').primaryKey().references(() => vehicles.id, { onDelete: 'cascade' }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  speed: smallint('speed'),
  angle: smallint('angle'),
  ignition: boolean('ignition'),
  odometer: integer('odometer'),
  status: vehicleStatusEnum('status'),
  stateChangedAt: timestamp('state_changed_at', { withTimezone: true }),
  address: text('address'),
  todayKm: numeric('today_km', { precision: 6, scale: 1 }).default('0'),
  todayOdometerBase: integer('today_odometer_base'),
  todayDate: date('today_date'),
})
