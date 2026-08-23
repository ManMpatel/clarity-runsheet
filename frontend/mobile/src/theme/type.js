// Inter Variable is web's typeface (--font-sans in frontend/web/src/index.css). Variable fonts
// aren't supported the same way in React Native — @expo-google-fonts ships discrete weights
// instead — so this loads the specific Inter cuts the scale below actually uses.
//
// Imported by per-weight SUBPATH, not from the package root. The root index.js is a barrel of 18
// top-level `require()` calls (every weight, plus every italic); Metro can't tree-shake those, so
// importing four names from it pulled all 18 .ttf files — ~6.2 MB — into the bundle. These four
// are the only cuts the scale below references.
import { Platform } from 'react-native'
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular'
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium'
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold'
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold'

export const interFonts = { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold }

// One shared scale so every screen's headings/body/captions line up instead of each screen
// picking its own fontSize (the old screens each hand-rolled StyleSheet.create font sizes).
// `tabular` variants use Inter's tabular-figure metrics for numeric columns (speed, odometer,
// currency) — mirrors web's `.tabular` utility in index.css.
export const type = {
  display: { fontFamily: 'Inter_700Bold', fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  title1: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  title2: { fontFamily: 'Inter_600SemiBold', fontSize: 20, lineHeight: 26 },
  title3: { fontFamily: 'Inter_600SemiBold', fontSize: 17, lineHeight: 22 },
  body: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21 },
  bodyMedium: { fontFamily: 'Inter_500Medium', fontSize: 15, lineHeight: 21 },
  bodySemibold: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 21 },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  captionMedium: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  tabularTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 30, fontVariant: ['tabular-nums'] },
  tabularBody: { fontFamily: 'Inter_600SemiBold', fontSize: 15, lineHeight: 21, fontVariant: ['tabular-nums'] },
}

// ---------------------------------------------------------------------------
// Apple text styles — used by screens/auth/ only (see DECISIONS.md D-017).
//
// The scale above is the app's own; this one is Apple's iOS ramp, and the two coexist
// deliberately. Typography is the single biggest factor in whether a screen reads as native iOS,
// so the auth flow uses the real system face rather than an approximation of it.
// ---------------------------------------------------------------------------

const interForWeight = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
}

// On iOS, omitting `fontFamily` entirely is what makes RN resolve the system face — SF Pro — and
// `fontWeight` then picks the cut (iOS swaps to SF Pro Display above ~20pt on its own). Setting
// fontFamily to *anything*, including 'System', costs you that automatic optical sizing.
// SF Pro isn't licensed off-Apple-platforms, so Android falls back to the Inter cut already
// bundled for that weight — near-identical metrics, so the layouts below hold on both.
const face = (weight) =>
  Platform.select({
    ios: { fontWeight: weight },
    default: { fontFamily: interForWeight[weight] },
  })

// Apple's default (non-Dynamic-Type) sizes. `letterSpacing` is points in RN, not em — these are
// SF's tracking table rounded to the nearest sensible value at each size.
export const appleType = {
  largeTitle: { ...face('700'), fontSize: 34, lineHeight: 41, letterSpacing: -0.4 },
  title1: { ...face('700'), fontSize: 28, lineHeight: 34, letterSpacing: -0.35 },
  title2: { ...face('700'), fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  title3: { ...face('600'), fontSize: 20, lineHeight: 25, letterSpacing: -0.25 },
  headline: { ...face('600'), fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  body: { ...face('400'), fontSize: 17, lineHeight: 22, letterSpacing: -0.4 },
  callout: { ...face('400'), fontSize: 16, lineHeight: 21, letterSpacing: -0.3 },
  subheadline: { ...face('400'), fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  footnote: { ...face('400'), fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  footnoteEmphasized: { ...face('600'), fontSize: 13, lineHeight: 18, letterSpacing: -0.05 },
  caption1: { ...face('400'), fontSize: 12, lineHeight: 16, letterSpacing: 0 },
}
