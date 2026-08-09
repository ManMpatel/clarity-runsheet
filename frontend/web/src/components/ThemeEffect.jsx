import { useEffect } from 'react'
import { useUiStore } from '../store/uiStore'
import { applyTheme } from '../lib/theme'

/**
 * Null-rendering. Mounted once at the top of App so the OS theme is followed live while the
 * preference is 'system'. Deliberately not a context provider — reading the theme anywhere
 * would then re-render that subtree on every toggle, and zustand already handles the reads.
 */
export default function ThemeEffect() {
  useEffect(() => {
    // The inline bootstrap in index.html ran before zustand hydrated from localStorage; reconcile
    // once here in case persist resolved to something different (e.g. a v0 -> v1 migration).
    applyTheme(useUiStore.getState().theme)

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => useUiStore.getState().syncSystemTheme()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return null
}
