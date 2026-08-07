import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useUiStore = create(
  persist(
    (set) => ({
      darkMode:      false,
      sidebarOpen:   true,

      toggleDarkMode() {
        set(state => {
          const next = !state.darkMode
          document.documentElement.classList.toggle('dark', next)
          return { darkMode: next }
        })
      },

      initDarkMode() {
        const stored = JSON.parse(
          localStorage.getItem('clarity-ui') || '{}'
        )
        const dark = stored?.state?.darkMode ?? false
        document.documentElement.classList.toggle('dark', dark)
      },

      toggleSidebar() {
        set(state => ({ sidebarOpen: !state.sidebarOpen }))
      },
    }),
    { name: 'clarity-ui' }
  )
)
