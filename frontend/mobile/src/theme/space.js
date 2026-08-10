// 4pt spacing scale — every screen composes margins/paddings/gaps from this instead of ad-hoc
// numbers, which is most of what makes a redesign feel like one product instead of 20 one-off
// screens (see the old src/lib/theme.js, which only had 4 loosely-used values).
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 56,
}

// Uber-ish generous radii — bigger than the old theme.js's {sm:4, md:8, lg:12}, which read as a
// dense form UI rather than a spacious touch-first one.
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
}

// 4-step elevation, restrained like the web dashboard's --shadow-*-v scale — React Native has no
// CSS box-shadow, so these are the elevation/shadow* props consumed by ui/Card.js and Sheet.js.
export function shadowFor(scheme, level = 'sm') {
  const isDark = scheme === 'dark'
  const opacity = { xs: isDark ? 0.35 : 0.05, sm: isDark ? 0.4 : 0.08, md: isDark ? 0.5 : 0.1, lg: isDark ? 0.6 : 0.16 }
  const radiusPx = { xs: 2, sm: 6, md: 14, lg: 28 }
  const elevation = { xs: 1, sm: 2, md: 6, lg: 12 }
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: Math.round(radiusPx[level] / 3) },
    shadowOpacity: opacity[level],
    shadowRadius: radiusPx[level],
    elevation: elevation[level],
  }
}
