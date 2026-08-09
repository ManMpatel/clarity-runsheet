import { cn } from '../../lib/cn'

/**
 * aria-pressed makes the on/off state audible; the old hand-rolled chips communicated selection
 * with a background colour and nothing else.
 */
export default function FilterChip({ active = false, count, className, children, ...rest }) {
  return (
    <button
      type='button'
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium',
        'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
        active
          ? 'bg-accent text-fg-on-accent'
          : 'bg-surface-2 text-fg-muted hover:text-fg hover:bg-surface-3',
        className
      )}
      {...rest}
    >
      {children}
      {count != null && (
        <span className={cn('tabular', active ? 'text-fg-on-accent/70' : 'text-fg-subtle')}>
          {count}
        </span>
      )}
    </button>
  )
}
