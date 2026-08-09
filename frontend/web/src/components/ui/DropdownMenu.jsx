import {
  createContext, useContext, useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react'
import { cn } from '../../lib/cn'
import { useOnClickOutside, useEscapeKey, getFocusable } from '../../hooks/overlay'

const MenuCtx = createContext(null)

export function DropdownMenu({ children, className }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const contentRef = useRef(null)
  const id = useId()

  const close = useCallback((restoreFocus = true) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus?.({ preventScroll: true })
  }, [])

  const refs = useMemo(() => [triggerRef, contentRef], [])
  useOnClickOutside(refs, () => setOpen(false), open)
  useEscapeKey(() => close(true), open)

  return (
    <MenuCtx.Provider value={{ open, setOpen, close, triggerRef, contentRef, id }}>
      <div className={cn('relative', className)}>{children}</div>
    </MenuCtx.Provider>
  )
}

export function DropdownMenuTrigger({ children, className, ...rest }) {
  const { open, setOpen, triggerRef, id } = useContext(MenuCtx)
  return (
    <button
      ref={triggerRef}
      type='button'
      aria-haspopup='menu'
      aria-expanded={open}
      aria-controls={open ? id : undefined}
      onClick={() => setOpen(o => !o)}
      onKeyDown={e => {
        // Opening with a down-arrow should land on the first item, matching native select menus.
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          if (!open) { e.preventDefault(); setOpen(true) }
        }
      }}
      className={cn(
        'outline-none rounded-control focus-visible:ring-2 focus-visible:ring-ring',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas', className
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

const ALIGN = { start: 'left-0', end: 'right-0', center: 'left-1/2 -translate-x-1/2' }
const SIDE = { bottom: 'top-full mt-1.5', top: 'bottom-full mb-1.5' }

export function DropdownMenuContent({ align = 'end', side = 'bottom', className, children, ...rest }) {
  const { open, contentRef, id } = useContext(MenuCtx)

  // Roving focus: arrow keys move between items rather than Tab, which is what `role=menu`
  // promises to assistive tech.
  useEffect(() => {
    if (!open) return
    const node = contentRef.current
    if (!node) return
    const items = getFocusable(node)
    items[0]?.focus({ preventScroll: true })

    function onKeyDown(e) {
      const list = getFocusable(contentRef.current)
      if (list.length === 0) return
      const idx = list.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') { e.preventDefault(); list[(idx + 1) % list.length].focus() }
      if (e.key === 'ArrowUp')   { e.preventDefault(); list[(idx - 1 + list.length) % list.length].focus() }
      if (e.key === 'Home')      { e.preventDefault(); list[0].focus() }
      if (e.key === 'End')       { e.preventDefault(); list[list.length - 1].focus() }
    }
    node.addEventListener('keydown', onKeyDown)
    return () => node.removeEventListener('keydown', onKeyDown)
  }, [open, contentRef])

  if (!open) return null

  return (
    <div
      ref={contentRef}
      id={id}
      role='menu'
      className={cn(
        'absolute z-50 min-w-52 p-1 rounded-card border border-border bg-surface shadow-popover',
        'motion-safe:animate-[pop-in_120ms_ease-out] origin-top',
        ALIGN[align], SIDE[side], className
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

export function DropdownMenuItem({
  onSelect, destructive = false, icon: Icon, disabled = false, className, children, ...rest
}) {
  const { close } = useContext(MenuCtx)
  return (
    <button
      type='button'
      role='menuitem'
      disabled={disabled}
      onClick={e => { onSelect?.(e); close(false) }}
      className={cn(
        'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-control text-sm text-left',
        'transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none',
        destructive
          ? 'text-danger-fg hover:bg-danger-soft focus-visible:bg-danger-soft'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg focus-visible:bg-surface-2 focus-visible:text-fg',
        className
      )}
      {...rest}
    >
      {Icon && <Icon className='size-4 shrink-0' aria-hidden='true' />}
      {children}
    </button>
  )
}

export function DropdownMenuLabel({ className, children }) {
  return <div className={cn('px-2.5 py-2', className)}>{children}</div>
}

export function DropdownMenuSeparator({ className }) {
  return <div className={cn('h-px bg-border my-1 -mx-1', className)} role='separator' />
}

export default DropdownMenu
