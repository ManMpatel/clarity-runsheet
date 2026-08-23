import { useRef } from 'react'
import { cn } from '../../lib/cn'

/**
 * radiogroup with arrow-key navigation. Used for the theme picker (light/dark/system — three
 * states a two-state toggle can't express) and the dashboard date-range selector.
 *
 * options: [{ value, label, icon?, srLabel? }]
 */
export default function SegmentedControl({
  options = [], value, onChange, label, size = 'md', className,
}) {
  const ref = useRef(null)

  function onKeyDown(e) {
    const idx = options.findIndex(o => o.value === value)
    if (idx === -1) return
    let next = null
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % options.length
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + options.length) % options.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = options.length - 1
    if (next === null) return
    e.preventDefault()
    onChange?.(options[next].value)
    ref.current?.querySelectorAll('[role="radio"]')[next]?.focus()
  }

  const pad = size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-xs'

  return (
    <div
      ref={ref}
      role='radiogroup'
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn('inline-flex items-center gap-0.5 p-0.5 rounded-control bg-surface-2 border border-border', className)}
    >
      {options.map(opt => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type='button'
            role='radio'
            aria-checked={active}
            aria-label={opt.srLabel}
            // Only the selected option is in the tab order; arrows move within the group.
            tabIndex={active ? 0 : -1}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md font-medium',
              'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
              pad,
              active
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg'
            )}
          >
            {Icon && <Icon className='size-3.5 shrink-0' aria-hidden='true' />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
