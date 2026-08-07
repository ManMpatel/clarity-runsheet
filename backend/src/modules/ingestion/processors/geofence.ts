// Ported from worker/processors/geofence.js. The old point-in-polygon check ran in application
// code (a hand-rolled ray-casting algorithm); this is now a real logic change explicitly
// authorized by Phase 5 (distinct from the tcp-listener "zero diff" constraint): containment is
// now a PostGIS ST_Contains query, and enter/exit transition detection compares against the
// in-memory state.ts containment map (replacing the old per-zone Redis geo:state key).
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { geofences, geofenceEvents } from '../../../db/schema'
import { isInsideZone, setInsideZone } from '../state'
import type { NormalisedTelemetry } from './telemetry'

export async function processGeofences(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry) {
  const events: any[] = []

  // Vehicle-scoped zones (geofence_vehicles has a row for this vehicle) OR company-wide zones
  // (no rows in geofence_vehicles at all) — same "empty vehicleIds = applies to all" semantics
  // as the old embedded array.
  const zones = await db.execute(sql`
    SELECT g.id, g.name,
           ST_Contains(g.geometry, ST_SetSRID(ST_MakePoint(${record.lng}, ${record.lat}), 4326)) AS inside
    FROM geofences g
    WHERE g.company_id = ${companyId}
      AND g.active = true
      AND g.geometry IS NOT NULL
      AND (
        NOT EXISTS (SELECT 1 FROM geofence_vehicles gv WHERE gv.geofence_id = g.id)
        OR EXISTS (SELECT 1 FROM geofence_vehicles gv WHERE gv.geofence_id = g.id AND gv.vehicle_id = ${vehicleId})
      )
  `)

  for (const zone of zones.rows as any[]) {
    const inside = zone.inside === true
    const wasInside = isInsideZone(vehicleId, zone.id)

    if (inside && !wasInside) {
      setInsideZone(vehicleId, zone.id, true)
      events.push(await saveGeofenceEvent(imei, companyId, vehicleId, record, zone, 'enter'))
    } else if (!inside && wasInside) {
      setInsideZone(vehicleId, zone.id, false)
      events.push(await saveGeofenceEvent(imei, companyId, vehicleId, record, zone, 'exit'))
    }
  }

  return events
}

async function saveGeofenceEvent(imei: string, companyId: string, vehicleId: string, record: NormalisedTelemetry, zone: { id: string; name: string }, type: 'enter' | 'exit') {
  const [event] = await db.insert(geofenceEvents).values({
    type,
    imei,
    companyId,
    vehicleId,
    zoneId: zone.id,
    zoneName: zone.name,
    timestamp: record.time,
    lat: record.lat,
    lng: record.lng,
  }).returning()

  return event
}
