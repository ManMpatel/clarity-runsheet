// Short-lived debounce/cooldown state, process-local, lost on restart. This is the deliberate
// replacement for the old Redis-backed alert:cooldown / geo:state keys (worker/db/redis.js) —
// since Redis is being removed everywhere except the telemetry_queue handoff, and a brief
// duplicate alert or spurious enter/exit event right after a rare ingestion restart is low-stakes,
// this stays in-memory rather than moving to a Postgres table. (Contrast with
// maintenance.lastFlaggedAt, which DOES need to survive restarts — see cron/maintenance-flags.ts.)

const cooldowns = new Map<string, number>() // key -> expiry epoch ms

export function checkCooldown(key: string): boolean {
  const expiry = cooldowns.get(key)
  if (expiry === undefined) return false
  if (Date.now() >= expiry) {
    cooldowns.delete(key)
    return false
  }
  return true
}

export function setCooldown(key: string, ttlSeconds: number): void {
  cooldowns.set(key, Date.now() + ttlSeconds * 1000)
}

// vehicleId -> Set of geofence ids the vehicle is currently considered "inside".
// Replaces the old per-zone Redis geo:state:{imei}:{zoneId} keys with one Set per vehicle.
export const geofenceContainment = new Map<string, Set<string>>()

export function isInsideZone(vehicleId: string, zoneId: string): boolean {
  return geofenceContainment.get(vehicleId)?.has(zoneId) ?? false
}

export function setInsideZone(vehicleId: string, zoneId: string, inside: boolean): void {
  let set = geofenceContainment.get(vehicleId)
  if (!set) {
    set = new Set()
    geofenceContainment.set(vehicleId, set)
  }
  if (inside) set.add(zoneId)
  else set.delete(zoneId)
}

// Active-trip working state, keyed by imei. Replaces the old Redis `trip:active:{imei}` cache.
// Unlike alert/geofence cooldowns, the FACT that a trip is open is durable (it's a `trips` row
// with end_time IS NULL — see trip-builder.ts), but the accumulating distance/lastMovement
// bookkeeping between packets is still cheaper to keep in memory than round-tripping through
// Postgres on every single telemetry point. If ingestion restarts mid-trip, the open trip row
// is still found via the DB query and simply gets "topped up" from the next packet onward
// (self-healing, at the cost of losing a few metres of mid-trip distance accounting for that
// one restart — acceptable per the same low-stakes reasoning as the cooldowns above).
interface ActiveTripState {
  tripId: string
  lastMovement: number
  distanceMetres: number
  maxSpeed: number
  prevLat: number
  prevLng: number
}

const activeTrips = new Map<string, ActiveTripState>()

export function getActiveTripState(imei: string): ActiveTripState | undefined {
  return activeTrips.get(imei)
}

export function setActiveTripState(imei: string, state: ActiveTripState): void {
  activeTrips.set(imei, state)
}

export function clearActiveTripState(imei: string): void {
  activeTrips.delete(imei)
}
