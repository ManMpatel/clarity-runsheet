import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyTheme, isDark } from '../lib/theme'

export const useUiStore = create(
  persist(
    (set, get) => ({
      theme: 'system',          // 'light' | 'dark' | 'system'
      darkMode: false,          // resolved boolean, mirrored for back-compat only
      sidebarCollapsed: false,  // replaces the old `sidebarOpen`, which nothing ever read
      mobileNavOpen: false,     // not persisted — see partialize

      setTheme(theme) {
        const dark = applyTheme(theme)
        set({ theme, darkMode: dark })
      },

      /** Deprecated alias kept so any straggling caller keeps working. Cycles light <-> dark. */
      toggleDarkMode() {
        get().setTheme(isDark(get().theme) ? 'light' : 'dark')
      },

      /** Re-resolve after an OS-level change while theme === 'system'. */
      syncSystemTheme() {
        if (get().theme !== 'system') return
        set({ darkMode: applyTheme('system') })
      },

      toggleSidebar() {
        set(s => ({ sidebarCollapsed: !s.sidebarCollapsed }))
      },

      setMobileNavOpen(open) {
        set({ mobileNavOpen: open })
      },
    }),
    {
      name: 'clarity-ui',
      version: 1,
      migrate(persisted, version) {
        if (version === 0 || version === undefined) {
          // v0 stored only a boolean. Map it to an EXPLICIT choice rather than 'system' — someone
          // who deliberately turned dark mode on should not silently start following their OS.
          const dark = persisted?.darkMode ?? false
          return { theme: dark ? 'dark' : 'light', darkMode: dark, sidebarCollapsed: false }
        }
        return persisted
      },
      partialize: s => ({
        theme: s.theme,
        darkMode: s.darkMode,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    }
  )
)
