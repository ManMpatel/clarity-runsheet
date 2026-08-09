// One definition of the light/dark/system rule, shared by uiStore and ThemeEffect. The inline
// bootstrap script in index.html duplicates this logic on purpose — it has to run before any
// module loads to avoid a flash — so keep the two in sync if the rule ever changes.

export const THEMES = ['light', 'dark', 'system']

export function systemPrefersDark() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
}

/** Resolve a theme preference to a concrete boolean. */
export function isDark(theme) {
  if (theme === 'dark') return true
  if (theme === 'light') return false
  return systemPrefersDark()
}

/** Apply a theme preference to <html>. Returns the resolved boolean. */
export function applyTheme(theme) {
  const dark = isDark(theme)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  // Drives native form controls, scrollbars and the browser's own UA styles.
  root.style.colorScheme = dark ? 'dark' : 'light'
  return dark
}
