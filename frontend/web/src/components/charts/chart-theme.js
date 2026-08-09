// Recharts resolves `stroke`/`fill` strings straight into SVG attributes, so handing it
// `var(--accent)` means every chart re-themes on a light/dark toggle with no JS and no re-render.
// That is why nothing here is a hex value.

export const CHART_COLORS = ['var(--accent)', 'var(--info)', 'var(--success)', 'var(--warning)']

export const STATUS_COLORS = {
  moving:  'var(--status-moving)',
  idle:    'var(--status-idle)',
  stopped: 'var(--status-stopped)',
  offline: 'var(--status-offline)',
}

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--fg-subtle)', fontSize: 11 },
  stroke: 'var(--border)',
}

export const gridProps = {
  strokeDasharray: '3 3',
  stroke: 'var(--border)',
  vertical: false,
}

export const cursorProps = {
  stroke: 'var(--border-strong)',
  strokeWidth: 1,
  strokeDasharray: '3 3',
}

/** Compact axis formatter — 1.2k rather than 1200, so the y-axis stays narrow. */
export function compactNumber(n) {
  if (n == null || Number.isNaN(n)) return '0'
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`
  if (abs >= 1_000) return `${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`
  return String(Math.round(n))
}

/** '2026-08-09' -> 'Sat 9' for a dense x-axis. */
export function shortDate(iso) {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric' })
}
