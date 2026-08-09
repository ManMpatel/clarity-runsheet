import { clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge only knows Tailwind's built-in class groups. Our semantic tokens (bg-surface,
// text-fg-muted, rounded-card, shadow-popover — see styles/tokens.css) are invisible to it, so
// without this registration `cn('bg-surface', 'bg-danger')` keeps BOTH classes and whichever
// Tailwind emitted last wins. That reads as "the className prop on my primitive does nothing",
// which is a genuinely confusing afternoon to debug — hence spelling every token out here.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ['control', 'card', 'modal'],
    },
    classGroups: {
      'bg-color': [{
        bg: [
          'canvas', 'surface', 'surface-2', 'surface-3', 'overlay',
          'accent', 'accent-hover', 'accent-soft',
          'success', 'warning', 'danger', 'info',
          'moving', 'idle', 'stopped', 'offline',
        ],
      }],
      'text-color': [{
        text: [
          'fg', 'fg-muted', 'fg-subtle', 'fg-on-accent',
          'accent', 'accent-fg',
          'success', 'warning', 'danger', 'info',
          'success-fg', 'warning-fg', 'danger-fg', 'info-fg',
          'moving', 'idle', 'stopped', 'offline',
        ],
      }],
      'border-color': [{
        border: ['border', 'border-strong', 'accent', 'danger', 'success', 'warning', 'info'],
      }],
      'ring-color': [{ ring: ['ring', 'accent', 'danger'] }],
      shadow: [{ shadow: ['card', 'popover', 'modal'] }],
    },
  },
})

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export default cn
