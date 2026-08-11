// Inter Variable is web's typeface (--font-sans in frontend/web/src/index.css). Variable fonts
// aren't supported the same way in React Native — @expo-google-fonts ships discrete weights
// instead — so this loads the specific Inter cuts the scale below actually uses.
//
// Imported by per-weight SUBPATH, not from the package root. The root index.js is a barrel of 18
// top-level `require()` calls (every weight, plus every italic); Metro can't tree-shake those, so
// importing four names from it pulled all 18 .ttf files — ~6.2 MB — into the bundle. These four
// are the only cuts the scale below references.
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
