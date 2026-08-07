// Ported from api/routes/geofences.js. Mongo native driver -> Drizzle/Postgres. The `geometry`
// field is now PostGIS `geometry(Polygon,4326)` instead of an embedded GeoJSON document — Drizzle's
// typed geometry column doesn't decode WKB -> GeoJSON on read or accept raw GeoJSON on write, so
// geometry-touching statements use `db.execute(sql...)` with ST_GeomFromGeoJSON/ST_AsGeoJSON,
// same pattern as modules/ingestion/processors/geofence.ts. The old embedded `vehicleIds` array
// is now the `geofence_vehicles` join table — empty/no rows still means "applies to all vehicles".
import express from 'express'
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { db } from '../../../db/client'
import { geofences, geofenceVehicles, geofenceEvents } from '../../../db/schema'
import { requireAuth, requireRole, requireCompany } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

async function attachVehicleIds(zones: any[]) {
  if (!zones.length) return zones
  const rows = await db.select().from(geofenceVehicles)
    .where(inArray(geofenceVehicles.geofenceId, zones.map((z) => z.id)))
  const map = new Map<string, string[]>()
  for (const row of rows) {
    if (!map.has(row.geofenceId)) map.set(row.geofenceId, [])
    map.get(row.geofenceId)!.push(row.vehicleId)
  }
  return zones.map((z) => ({ ...z, vehicleIds: map.get(z.id) || [] }))
}

async function fetchZone(id: string, companyId: string) {
  const result = await db.execute(sql`
    SELECT id, company_id AS "companyId", name, ST_AsGeoJSON(geometry)::json AS geometry,
           centre_lat AS "centreLat", centre_lng AS "centreLng", radius_metres AS "radiusMetres",
           alert_on_exit AS "alertOnExit", alert_on_entry AS "alertOnEntry", active_hours_only AS "activeHoursOnly",
           active, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM geofences
    WHERE id = ${id} AND company_id = ${companyId}
    LIMIT 1
  `)
  const [zone] = result.rows as any[]
  if (!zone) return null
  const vehicleRows = await db.select().from(geofenceVehicles).where(eq(geofenceVehicles.geofenceId, id))
  zone.vehicleIds = vehicleRows.map((r) => r.vehicleId)
  return zone
}

router.get('/', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const result = await db.execute(sql`
    SELECT id, company_id AS "companyId", name, ST_AsGeoJSON(geometry)::json AS geometry,
           centre_lat AS "centreLat", centre_lng AS "centreLng", radius_metres AS "radiusMetres",
           alert_on_exit AS "alertOnExit", alert_on_entry AS "alertOnEntry", active_hours_only AS "activeHoursOnly",
           active, created_at AS "createdAt", updated_at AS "updatedAt"
    FROM geofences
    WHERE company_id = ${req.companyId}
    ORDER BY name
  `)
  const zones = await attachVehicleIds(result.rows as any[])
  return res.success(zones)
}))

router.get('/:id', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const zone = await fetchZone((req.params.id as string), req.companyId!)
  if (!zone) return res.fail(null, 'Zone not found', 404)
  return res.success(zone)
}))

router.post('/', requireAuth, requireCompany, requireRole('companyAdmin', 'fleetManager', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, geometry, alertOnExit, alertOnEntry, activeHoursOnly, vehicleIds, centre, radiusMetres } = req.body
  if (!name || !geometry) {
    return res.fail(null, 'Name and geometry required')
  }

  const [zone] = await db.insert(geofences).values({
    companyId: req.companyId!,
    name,
    centreLat: centre?.lat ?? null,
    centreLng: centre?.lng ?? null,
    radiusMetres: radiusMetres ?? null,
    alertOnExit: alertOnExit ?? true,
    alertOnEntry: alertOnEntry ?? false,
    activeHoursOnly: activeHoursOnly ?? false,
    active: true,
  }).returning()

  await db.execute(sql`UPDATE geofences SET geometry = ST_GeomFromGeoJSON(${JSON.stringify(geometry)}) WHERE id = ${zone.id}`)

  if (Array.isArray(vehicleIds) && vehicleIds.length) {
    await db.insert(geofenceVehicles).values(vehicleIds.map((vehicleId: string) => ({ geofenceId: zone.id, vehicleId })))
  }

  const created = await fetchZone(zone.id, req.companyId!)
  return res.success(created, 'Geofence created')
}))

router.put('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'fleetManager', 'superAdmin'), asyncRoute(async (req, res) => {
  const { name, geometry, alertOnExit, alertOnEntry, activeHoursOnly, active, vehicleIds } = req.body

  const [updated] = await db.update(geofences).set({
    name, alertOnExit, alertOnEntry, activeHoursOnly, active, updatedAt: new Date(),
  }).where(and(eq(geofences.id, (req.params.id as string)), eq(geofences.companyId, req.companyId!))).returning()

  if (!updated) return res.fail(null, 'Zone not found', 404)

  if (geometry) {
    await db.execute(sql`UPDATE geofences SET geometry = ST_GeomFromGeoJSON(${JSON.stringify(geometry)}) WHERE id = ${updated.id}`)
  }

  // Old code always overwrote vehicleIds with `vehicleIds || []` — replicate the same
  // "always replace, default to empty (= applies to all)" semantics.
  await db.delete(geofenceVehicles).where(eq(geofenceVehicles.geofenceId, updated.id))
  if (Array.isArray(vehicleIds) && vehicleIds.length) {
    await db.insert(geofenceVehicles).values(vehicleIds.map((vehicleId: string) => ({ geofenceId: updated.id, vehicleId })))
  }

  const result = await fetchZone(updated.id, req.companyId!)
  return res.success(result)
}))

router.delete('/:id', requireAuth, requireCompany, requireRole('companyAdmin', 'superAdmin'), asyncRoute(async (req, res) => {
  const [zone] = await db.select().from(geofences)
    .where(and(eq(geofences.id, (req.params.id as string)), eq(geofences.companyId, req.companyId!)))
    .limit(1)
  if (!zone) return res.success({ success: true })

  await db.delete(geofenceVehicles).where(eq(geofenceVehicles.geofenceId, zone.id))
  await db.delete(geofences).where(eq(geofences.id, zone.id))
  return res.success({ success: true })
}))

router.get('/:id/events', requireAuth, requireCompany, asyncRoute(async (req, res) => {
  const { from, to, limit = '50' } = req.query as Record<string, string>

  const conditions = [
    eq(geofenceEvents.companyId, req.companyId!),
    eq(geofenceEvents.zoneId, (req.params.id as string)),
  ]
  if (from && to) {
    conditions.push(gte(geofenceEvents.timestamp, new Date(from)))
    conditions.push(lte(geofenceEvents.timestamp, new Date(to)))
  }

  const events = await db.select().from(geofenceEvents)
    .where(and(...conditions))
    .orderBy(desc(geofenceEvents.timestamp))
    .limit(parseInt(limit))

  return res.success(events)
}))

export default router
