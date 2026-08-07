import { pgTable, uuid, timestamp, doublePrecision, smallint, boolean, integer } from 'drizzle-orm/pg-core'
import { vehicles } from './vehicles'

// One row per vehicle, upserted in place on every telemetry packet. Replaces the old
// Redis `van:state:{imei}` cache — this is now the single source of truth for "where is
// this vehicle right now", read directly by the API (no more Redis in the read path).
export const vehicleState = pgTable('vehicle_state', {
  vehicleId: uuid('vehicle_id').primaryKey().references(() => vehicles.id),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  speed: smallint('speed'),
  ignition: boolean('ignition'),
  odometer: integer('odometer'),
})
