/**
 * Timestamp handling used to be inconsistent in a way that silently broke a dashboard stat:
 * GET /telemetry/live returns `updatedAt` as an ISO string, while the socket path stamped it as a
 * number, so `Date.now() - van.updatedAt` produced NaN for HTTP-sourced vans and the "unreachable"
 * count sat permanently at zero. Everything goes through toMs() now.
 */
export function toMs(value) {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (value instanceof Date) {
    const t = value.getTime()
    return Number.isNaN(t) ? null : t
  }
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed
}

/** Milliseconds elapsed since `value`, or null if it isn't a usable timestamp. */
export function ageMs(value, now = Date.now()) {
  const t = toMs(value)
  return t == null ? null : now - t
}

/** Compact elapsed label: '< 1 min', '42 min', '3h 10m', '2d'. */
export function sinceLabel(value, now = Date.now()) {
  const age = ageMs(value, now)
  if (age == null) return null

  const mins = Math.round(age / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`

  const hours = Math.floor(mins / 60)
  if (hours < 24) {
    const rem = mins % 60
    return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`
  }

  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day' : `${days} days`
}

/** Time-of-day for alert rows, in the app's AU locale. */
export function timeLabel(value) {
  const t = toMs(value)
  if (t == null) return ''
  return new Date(t).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

export function formatKm(value, digits = 0) {
  // numeric columns arrive from node-postgres as strings ('12.40'), so coerce before formatting.
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-AU', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function formatDuration(minutes) {
  const n = Number(minutes)
  if (!Number.isFinite(n) || n <= 0) return '0m'
  const h = Math.floor(n / 60)
  const m = Math.round(n % 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Today's date in the user's locale, e.g. 'Sunday 9 August 2026'. */
export function longDateLabel(date = new Date()) {
  return date.toLocaleDateString('en-AU', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}
