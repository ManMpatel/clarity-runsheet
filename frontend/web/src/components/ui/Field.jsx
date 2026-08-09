import { cloneElement, useId } from 'react'
import { cn } from '../../lib/cn'

/**
 * Wires up the label/hint/error relationships that get skipped when every form is hand-rolled:
 * generates an id, points <label for> at the control, and lists the hint + error in
 * aria-describedby so both are actually read out. Pass a single form control as the child.
 */
export default function Field({ label, hint, error, required, className, children }) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`

  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined

  const control = cloneElement(children, {
    id,
    'aria-describedby': describedBy,
    'aria-invalid': error ? true : undefined,
    'aria-required': required || undefined,
    invalid: error ? true : undefined,
  })

  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={id} className='block text-sm font-medium text-fg'>
          {label}
          {required && <span className='text-danger ml-0.5' aria-hidden='true'>*</span>}
        </label>
      )}
      {hint && <p id={hintId} className='text-xs text-fg-muted'>{hint}</p>}
      {control}
      {error && <p id={errorId} className='text-xs text-danger-fg'>{error}</p>}
    </div>
  )
}
