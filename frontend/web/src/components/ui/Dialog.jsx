import { createContext, useContext, useCallback, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useFocusTrap, useLockBodyScroll, useEscapeKey } from '../../hooks/overlay'

const DialogCtx = createContext(null)

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }

/**
 * Replaces the seven hand-rolled `fixed inset-0 bg-black/40` modals previously copy-pasted across
 * Drivers, VehicleHealth, DriverBehaviour, Maintenance, GeofenceManager, VehiclesSection and
 * AdminPanel — none of which had a portal, focus trap, Escape handler or scroll lock.
 */
export default function Dialog({ open, onOpenChange, size = 'md', children, className }) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descId = useId()

  const close = useCallback(() => onOpenChange?.(false), [onOpenChange])

  useLockBodyScroll(open)
  useFocusTrap(panelRef, open)
  useEscapeKey(close, open)

  if (!open) return null

  return createPortal(
    <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
      <div className='absolute inset-0 bg-overlay motion-safe:animate-[fade-in_120ms_ease-out]'
           onClick={close} aria-hidden='true' />
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        aria-describedby={descId}
        tabIndex={-1}
        className={cn(
          'relative w-full bg-surface border border-border rounded-modal shadow-modal',
          'outline-none max-h-[calc(100svh-2rem)] flex flex-col',
          SIZES[size], className
        )}
      >
        <DialogCtx.Provider value={{ close, titleId, descId }}>{children}</DialogCtx.Provider>
      </div>
    </div>,
    document.body
  )
}

export function DialogHeader({ className, children, showClose = true }) {
  const { close } = useContext(DialogCtx) ?? {}
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)}>
      <div className='min-w-0'>{children}</div>
      {showClose && (
        <button
          type='button' onClick={close} aria-label='Close dialog'
          className='shrink-0 -mr-1 -mt-1 size-8 rounded-control text-fg-subtle hover:bg-surface-2
                     hover:text-fg transition-colors inline-flex items-center justify-center
                     outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <X className='size-4' aria-hidden='true' />
        </button>
      )}
    </div>
  )
}

export function DialogTitle({ as: Comp = 'h2', className, children }) {
  const { titleId } = useContext(DialogCtx) ?? {}
  return <Comp id={titleId} className={cn('text-base font-semibold text-fg', className)}>{children}</Comp>
}

export function DialogDescription({ className, children }) {
  const { descId } = useContext(DialogCtx) ?? {}
  return <p id={descId} className={cn('text-sm text-fg-muted mt-1', className)}>{children}</p>
}

export function DialogBody({ className, children }) {
  return <div className={cn('px-5 py-2 overflow-y-auto', className)}>{children}</div>
}

export function DialogFooter({ className, children }) {
  return (
    <div className={cn('flex items-center justify-end gap-2 px-5 py-4 mt-auto', className)}>
      {children}
    </div>
  )
}
