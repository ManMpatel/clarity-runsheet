import { cloneElement, useEffect, useId, useState } from 'react'
import { cn } from '../../lib/cn'

const SIDES = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left:   'right-full top-1/2 -translate-y-1/2 mr-2',
  right:  'left-full top-1/2 -translate-y-1/2 ml-2',
}

/**
 * Wraps a single focusable child. Opens on hover AND focus — a tooltip that only responds to a
 * mouse is invisible to keyboard users, which matters here because the collapsed sidebar rail
 * relies on tooltips for every nav label.
 *
 * Handlers live on the wrapper rather than being cloned onto the child: React's focus events
 * bubble, so this catches the child's focus too, and it keeps the delay timer out of render
 * (passing a ref-reading closure as a prop during render is exactly what the react-hooks/refs
 * rule warns about).
 *
 * Never put interactive content inside: the panel is pointer-events-none and unreachable.
 */
export default function Tooltip({ content, side = 'top', delay = 300, disabled = false, children }) {
  const [pending, setPending] = useState(false)
  const [open, setOpen] = useState(false)
  const id = useId()

  useEffect(() => {
    if (!pending) return undefined
    const t = setTimeout(() => setOpen(true), delay)
    return () => clearTimeout(t)
  }, [pending, delay])

  function close() {
    setPending(false)
    setOpen(false)
  }

  if (disabled || !content) return children

  return (
    <span
      className='relative inline-flex'
      onMouseEnter={() => setPending(true)}
      onMouseLeave={close}
      onFocus={() => { setPending(true); setOpen(true) }}
      onBlur={close}
      onKeyDown={e => { if (e.key === 'Escape') close() }}
    >
      {cloneElement(children, { 'aria-describedby': open ? id : undefined })}
      {open && (
        <span
          id={id}
          role='tooltip'
          className={cn(
            'absolute z-50 pointer-events-none whitespace-nowrap rounded-control',
            'bg-fg text-canvas text-xs font-medium px-2 py-1 shadow-popover',
            SIDES[side]
          )}
        >
          {content}
        </span>
      )}
    </span>
  )
}
