import { useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../lib/cn'
import { useFocusTrap, useLockBodyScroll, useEscapeKey } from '../../hooks/overlay'

const SIDES = {
  left:   'left-0 top-0 h-full border-r motion-safe:animate-[slide-in-left_180ms_ease-out]',
  right:  'right-0 top-0 h-full border-l motion-safe:animate-[slide-in-right_180ms_ease-out]',
  bottom: 'bottom-0 left-0 w-full border-t rounded-t-modal motion-safe:animate-[slide-in-up_180ms_ease-out]',
}

/** Edge-anchored panel sharing Dialog's machinery. Used for the mobile navigation drawer. */
export default function Sheet({
  open, onOpenChange, side = 'left', size = '17.5rem', label, children, className,
}) {
  const panelRef = useRef(null)
  const close = useCallback(() => onOpenChange?.(false), [onOpenChange])

  useLockBodyScroll(open)
  useFocusTrap(panelRef, open)
  useEscapeKey(close, open)

  if (!open) return null

  const sizeStyle = side === 'bottom' ? { maxHeight: size } : { width: size }

  return createPortal(
    <div className='fixed inset-0 z-50'>
      <div className='absolute inset-0 bg-overlay' onClick={close} aria-hidden='true' />
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label={label}
        tabIndex={-1}
        style={sizeStyle}
        className={cn(
          'absolute bg-surface border-border shadow-modal outline-none flex flex-col',
          SIDES[side], className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}
