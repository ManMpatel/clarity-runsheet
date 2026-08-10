// Ported 1:1 from frontend/web/src/styles/tokens.css so web and mobile finally agree on colour —
// before this rebuild, mobile had its own unrelated palette (accent #2563eb vs web's #4f46e5)
// and the "moving/idle/stopped/offline" status colours drifted across four different files
// (mobile tiles, mobile map HTML, web markers, web tokens). These are now the single source for
// both. `color-mix()` isn't available in React Native style values, so the *-soft tokens are
// pre-computed hex equivalents of the CSS `color-mix(in oklab, X 9-18%, surface)` formulas.
export const light = {
  canvas: '#f8fafc',
  surface: '#ffffff',
  surface2: '#f1f5f9',
  surface3: '#e2e8f0',
  overlay: 'rgba(15, 23, 42, 0.40)',

  border: '#e2e8f0',
  borderStrong: '#cbd5e1',

  fg: '#0f172a',
  fgMuted: '#475569',
  fgSubtle: '#94a3b8',
  fgOnAccent: '#ffffff',

  accent: '#4f46e5',
  accentHover: '#4338ca',
  accentFg: '#4338ca',
  accentSoft: '#f2f1fd',
  ring: '#6366f1',

  success: '#059669',
  successFg: '#047857',
  successSoft: '#e6f5f0',
  warning: '#d97706',
  warningFg: '#b45309',
  warningSoft: '#fbedda',
  danger: '#dc2626',
  dangerFg: '#b91c1c',
  dangerSoft: '#fbe4e2',
  info: '#0284c7',
  infoFg: '#0369a1',
  infoSoft: '#dff1fa',

  statusMoving: '#059669',
  statusIdle: '#d97706',
  statusStopped: '#64748b',
  statusOffline: '#a855f7',
}

export const dark = {
  canvas: '#09090b',
  surface: '#111114',
  surface2: '#18181b',
  surface3: '#27272a',
  overlay: 'rgba(0, 0, 0, 0.65)',

  border: '#27272a',
  borderStrong: '#3f3f46',

  fg: '#fafafa',
  fgMuted: '#a1a1aa',
  fgSubtle: '#71717a',
  fgOnAccent: '#ffffff',

  accent: '#6366f1',
  accentHover: '#818cf8',
  accentFg: '#a5b4fc',
  accentSoft: '#242451',
  ring: '#818cf8',

  success: '#10b981',
  successFg: '#34d399',
  successSoft: '#1a3a30',
  warning: '#f59e0b',
  warningFg: '#fbbf24',
  warningSoft: '#3d2f14',
  danger: '#ef4444',
  dangerFg: '#f87171',
  dangerSoft: '#3d1f1e',
  info: '#38bdf8',
  infoFg: '#7dd3fc',
  infoSoft: '#173447',

  statusMoving: '#10b981',
  statusIdle: '#f59e0b',
  statusStopped: '#71717a',
  statusOffline: '#c084fc',
}

// Uber's actual visual language on top of the ported palette: a near-black/white neutral base
// used for almost everything, with `accent` reserved strictly for primary actions (buttons,
// active tab, links) — not decoration. `statusX` tokens stay authoritative for vehicle-state
// colour everywhere (map markers, stat tiles, badges) so that meaning never competes with brand.
export function paletteFor(scheme) {
  return scheme === 'dark' ? dark : light
}
