import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useColorScheme } from 'react-native'
import * as SecureStore from 'expo-secure-store'
import { paletteFor } from './tokens'
import { space, radius, shadowFor } from './space'
import { type } from './type'

// 'system' follows the OS (app.json's userInterfaceStyle: automatic); 'light'/'dark' are an
// explicit user override, persisted the same way the refresh token is (expo-secure-store) so it
// survives app restarts without needing a backend round-trip.
const OVERRIDE_KEY = 'themeOverride'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme() // 'light' | 'dark' | null
  const [override, setOverride] = useState(null) // null | 'light' | 'dark'
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    SecureStore.getItemAsync(OVERRIDE_KEY).then((v) => {
      if (v === 'light' || v === 'dark') setOverride(v)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const scheme = override || systemScheme || 'light'

  const value = useMemo(() => ({
    scheme,
    override,
    colors: paletteFor(scheme),
    space,
    radius,
    type,
    shadow: (level) => shadowFor(scheme, level),
    // 'system' clears the override so the OS setting takes over again.
    setThemeOverride: async (next) => {
      setOverride(next === 'system' ? null : next)
      if (next === 'system') {
        await SecureStore.deleteItemAsync(OVERRIDE_KEY)
      } else {
        await SecureStore.setItemAsync(OVERRIDE_KEY, next)
      }
    },
  }), [scheme, override])

  // Avoid a flash of the wrong theme while the persisted override is still loading.
  if (!loaded) return null

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
