import { pgEnum, pgTable, uuid, text, boolean, timestamp, doublePrecision, integer, index, primaryKey } from 'drizzle-orm/pg-core'
import { geometry } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { vehicles } from './vehicles'

export const geofences = pgTable('geofences', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  name: text('name').notNull(),
  // Client-supplied GeoJSON polygon, now PostGIS geometry — nullable when the zone is
  // circular (centre+radius) instead of a drawn polygon.
  geometry: geometry('geometry', { type: 'polygon', srid: 4326 }),
  centreLat: doublePrecision('centre_lat'),
  centreLng: doublePrecision('centre_lng'),
  radiusMetres: integer('radius_metres'),
  alertOnExit: boolean('alert_on_exit').notNull().default(false),
  alertOnEntry: boolean('alert_on_entry').notNull().default(false),
  activeHoursOnly: boolean('active_hours_only').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Replaces the old embedded `geofences.vehicleIds` array — a geofence with zero rows here
// applies to all of a company's vehicles (same "empty = all" semantics as before).
export const geofenceVehicles = pgTable('geofence_vehicles', {
  geofenceId: uuid('geofence_id').notNull().references(() => geofences.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
}, (t) => ({
  pk: primaryKey({ columns: [t.geofenceId, t.vehicleId] }),
}))

export const geofenceEventTypeEnum = pgEnum('geofence_event_type', ['enter', 'exit'])

export const geofenceEvents = pgTable('geofence_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: geofenceEventTypeEnum('type').notNull(),
  imei: text('imei').notNull(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  vehicleId: uuid('vehicle_id').notNull().references(() => vehicles.id),
  zoneId: uuid('zone_id').notNull().references(() => geofences.id),
  zoneName: text('zone_name').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  lat: doublePrecision('lat'),
  lng: doublePrecision('lng'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // NEW — queried by companyId+zoneId+timestamp with no index before.
  companyZoneTimeIdx: index('geofence_events_czt_idx').on(t.companyId, t.zoneId, t.timestamp),
}))
