// Postgres `numeric`/`decimal` columns come back from node-postgres as **strings**, not numbers —
// the driver preserves arbitrary precision rather than silently rounding through a JS float. That
// means `trip.distanceKm` is `"12.34"` on the wire, and `"12.34".toFixed` is `undefined`, which is
// what crashed the Activity tab (and would have crashed trip replay too).
//
// Web hit this first and solved it inline with `Number(...)` at each call site (see
// frontend/web/src/pages/TripsHistory.jsx); mobile was ported without the coercion. These helpers
// exist so the fix is one import instead of a `Number()` a future screen can forget again.
//
// The affected columns, as of this writing: trips.distanceKm, vehicle_state.todayKm,
// telemetry.externalVoltage, telemetry.batteryVoltage, telemetry.greenDrivingValue,
// safety_scores.*Score, driver_events.severity/value, companies.customPrice,
// alert_rules.voltageThreshold.

/** Coerces a wire value to a finite number, or null if it's absent/blank/unparseable. */
export function num(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

const DASH = '—'

/** `"12.34"` -> `"12.3 km"`. Null/blank/unparseable -> em dash. */
export function formatKm(value, decimals = 1) {
  const n = num(value)
  return n === null ? DASH : `${n.toFixed(decimals)} km`
}

/** `"12.60"` -> `"12.6V"`. Note 0 is a real reading, not "missing" — only null is missing. */
export function formatVolts(value, decimals = 1) {
  const n = num(value)
  return n === null ? DASH : `${n.toFixed(decimals)}V`
}

/** Rounds to a fixed number of decimals for display, em dash when there's nothing to show. */
export function formatNumber(value, decimals = 0) {
  const n = num(value)
  return n === null ? DASH : n.toFixed(decimals)
}

/** Minutes -> "1h 20m" / "45 min". Shared by the trip list and trip replay. */
export function formatDuration(mins) {
  const n = num(mins)
  if (n === null || n <= 0) return DASH
  const h = Math.floor(n / 60)
  const m = Math.round(n % 60)
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}
