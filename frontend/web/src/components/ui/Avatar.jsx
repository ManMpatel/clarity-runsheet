import { cn } from '../../lib/cn'

const SIZES = { sm: 'size-7 text-[11px]', md: 'size-8 text-xs', lg: 'size-10 text-sm' }

// Deterministic tint so the same person keeps the same colour across sessions and pages.
const TINTS = [
  'bg-accent-soft text-accent-fg',
  'bg-success-soft text-success-fg',
  'bg-warning-soft text-warning-fg',
  'bg-info-soft text-info-fg',
  'bg-danger-soft text-danger-fg',
]

function hash(str = '') {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/**
 * Pass `decorative` when the person's name is already rendered next to the avatar — otherwise a
 * screen reader reads the name twice in a row.
 */
export default function Avatar({ name = '', src, size = 'md', decorative = false, className }) {
  const tint = TINTS[hash(name) % TINTS.length]

  if (src) {
    return (
      <img
        src={src}
        alt={decorative ? '' : name}
        aria-hidden={decorative || undefined}
        className={cn('rounded-full object-cover shrink-0', SIZES[size], className)}
      />
    )
  }

  return (
    <span
      className={cn('rounded-full flex items-center justify-center font-semibold shrink-0', SIZES[size], tint, className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative || undefined}
    >
      {initials(name)}
    </span>
  )
}
