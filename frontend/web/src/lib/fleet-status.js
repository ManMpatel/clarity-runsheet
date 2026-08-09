import { ageMs } from './time'

/**
 * Matches the threshold GET /vehicles/status uses server-side, so the dashboard and that endpoint
 * never disagree about which vehicles are offline.
 */
export const OFFLINE_AFTER_MS = 15 * 60 * 1000

export const STATUS_LABELS = {
  moving: 'Moving',
  idle: 'Idle',
  stopped: 'Stopped',
  offline: 'Offline',
  online: 'Live',
  connecting: 'Connecting',
  disconnected: 'Offline',
}

export const STATUS_ORDER = ['moving', 'idle', 'stopped', 'offline']

/**
 * `vehicle_state.status` is a server-computed enum (moving|idle|stopped). The dashboard used to
 * ignore it and re-derive the same thing from speed/ignition, which drifted from what the map and
 * the alerts pipeline believed. Trust the server value; only fall back to the derivation for rows
 * written before that column existed.
 *
 * `offline` is layered on top rather than being a fifth server state, so the four counts always
 * sum to the number of reporting vehicles.
 */
export function vehicleStatus(van, now = Date.now()) {
  if (!van) return 'offline'

  const age = ageMs(van.updatedAt, now)
  if (age == null || age > OFFLINE_AFTER_MS) return 'offline'

  if (van.status) return van.status
  if ((van.speed ?? 0) > 0) return 'moving'
  return van.ignition ? 'idle' : 'stopped'
}

/** Tally a van list into {moving, idle, stopped, offline}. */
export function countByStatus(vans, now = Date.now()) {
  const counts = { moving: 0, idle: 0, stopped: 0, offline: 0 }
  for (const van of vans) {
    const s = vehicleStatus(van, now)
    if (counts[s] != null) counts[s] += 1
  }
  return counts
}
