import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Appearance, useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { paletteFor } from './tokens'
import { space, radius, shadowFor } from './space'
import { type, appleType } from './type'

// Stored as 'light' | 'dark' | 'system'. Missing key means light — the app should open in light
// mode even when the phone is set to dark. 'system' is an explicit Appearance choice.
const OVERRIDE_KEY = 'themeOverride'
const PREFERENCES = new Set(['light', 'dark', 'system'])

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme() // 'light' | 'dark' | null
  const [preference, setPreference] = useState('light')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync(OVERRIDE_KEY).then((v) => {
      if (PREFERENCES.has(v)) setPreference(v)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const scheme = preference === 'system' ? (systemScheme || 'light') : preference

  useEffect(() => {
    if (typeof Appearance.setColorScheme !== 'function') return
    Appearance.setColorScheme(preference === 'system' ? null : preference)
  }, [preference])

  const value = useMemo(() => ({
    scheme,
    preference,
    // null when following the OS — AppearanceScreen used this before `preference` existed.
    override: preference === 'system' ? null : preference,
    colors: paletteFor(scheme),
    space,
    radius,
    type,
    // Apple's text ramp, consumed by screens/auth/ only — see the note in theme/type.js.
    appleType,
    shadow: (level) => shadowFor(scheme, level),
    setThemeOverride: async (next) => {
      const resolved = PREFERENCES.has(next) ? next : 'light'
      setPreference(resolved)
      await SecureStore.setItemAsync(OVERRIDE_KEY, resolved)
    },
  }), [scheme, preference])

  // Avoid a flash of the wrong theme while the persisted override is still loading.
  if (!loaded) return null

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
