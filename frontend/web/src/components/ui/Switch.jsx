import { cn } from '../../lib/cn'

/**
 * role='switch' + aria-checked, rather than the bare <button> with a sliding <span> that the
 * Appearance settings page used to hand-roll — that version announced as an unlabelled button
 * with no state at all.
 */
export default function Switch({ checked = false, onChange, disabled, label, className, ...rest }) {
  return (
    <button
      type='button'
      role='switch'
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex w-11 h-6 shrink-0 rounded-full transition-colors outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'focus-visible:ring-offset-canvas disabled:opacity-50 disabled:pointer-events-none',
        checked ? 'bg-accent' : 'bg-surface-3',
        className
      )}
      {...rest}
    >
      <span
        aria-hidden='true'
        className={cn(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-5'
        )}
      />
    </button>
  )
}
