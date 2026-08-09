import { cloneElement, useCallback, useId, useMemo, useRef } from 'react'
import { cn } from '../../lib/cn'
import { useOnClickOutside, useEscapeKey, getFocusable } from '../../hooks/overlay'

const ALIGN = { start: 'left-0', end: 'right-0', center: 'left-1/2 -translate-x-1/2' }
const SIDE = { bottom: 'top-full mt-1.5', top: 'bottom-full mb-1.5' }

/**
 * Non-modal counterpart to DropdownMenu, for panels whose contents are a *list of things* rather
 * than a set of commands — the notification bell, primarily. Using role=menu there would promise
 * arrow-key command semantics the content doesn't have.
 *
 * The ref lives on a `display: contents` wrapper instead of being cloned onto the trigger: passing
 * a ref through cloneElement during render is what react-hooks/refs flags, and the wrapper costs
 * nothing in layout.
 */
export default function Popover({
  open, onOpenChange, trigger, align = 'end', side = 'bottom',
  label, className, children,
}) {
  const triggerRef = useRef(null)
  const contentRef = useRef(null)
  const id = useId()

  const close = useCallback(() => onOpenChange?.(false), [onOpenChange])

  const refs = useMemo(() => [triggerRef, contentRef], [])
  useOnClickOutside(refs, close, open)
  useEscapeKey(() => {
    close()
    getFocusable(triggerRef.current)[0]?.focus({ preventScroll: true })
  }, open)

  return (
    <div className='relative'>
      <span ref={triggerRef} className='contents'>
        {cloneElement(trigger, {
          'aria-haspopup': 'dialog',
          'aria-expanded': open,
          'aria-controls': open ? id : undefined,
          onClick: () => onOpenChange?.(!open),
        })}
      </span>
      {open && (
        <div
          ref={contentRef}
          id={id}
          role='dialog'
          aria-label={label}
          className={cn(
            'absolute z-50 rounded-card border border-border bg-surface shadow-popover',
            'motion-safe:animate-[pop-in_120ms_ease-out] origin-top',
            ALIGN[align], SIDE[side], className
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}
