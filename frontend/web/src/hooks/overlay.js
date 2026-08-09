import { useEffect, useRef } from 'react'

// Shared behaviour for every overlay primitive (Dialog, Sheet, DropdownMenu, Popover,
// CommandPalette). Grouped in one file because they are always used together and none of them is
// meaningful alone — a focus trap without a scroll lock is a half-built modal.

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function getFocusable(container) {
  if (!container) return []
  return Array.from(container.querySelectorAll(FOCUSABLE))
    .filter(el => el.offsetParent !== null || el === document.activeElement)
}

/**
 * Traps Tab/Shift+Tab inside `ref` while `active`, and returns focus to whatever was focused
 * before the overlay opened. That restore is the part people skip, and it's the part keyboard
 * users actually notice.
 */
export function useFocusTrap(ref, active) {
  const previouslyFocused = useRef(null)

  useEffect(() => {
    if (!active) return
    previouslyFocused.current = document.activeElement

    const node = ref.current
    const focusables = getFocusable(node)
    ;(focusables[0] || node)?.focus?.({ preventScroll: true })

    function onKeyDown(e) {
      if (e.key !== 'Tab') return
      const items = getFocusable(ref.current)
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus?.({ preventScroll: true })
    }
  }, [ref, active])
}

/**
 * Locks body scroll, compensating for the scrollbar width so the page doesn't shift sideways
 * when a modal opens. Ref-counted, so nested overlays don't unlock early.
 */
let lockCount = 0
let restoreStyles = null

export function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return
    if (lockCount === 0) {
      const { overflow, paddingRight } = document.body.style
      restoreStyles = { overflow, paddingRight }
      const gap = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      if (gap > 0) document.body.style.paddingRight = `${gap}px`
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0 && restoreStyles) {
        document.body.style.overflow = restoreStyles.overflow
        document.body.style.paddingRight = restoreStyles.paddingRight
        restoreStyles = null
      }
    }
  }, [active])
}

export function useEscapeKey(handler, active = true) {
  useEffect(() => {
    if (!active) return
    function onKeyDown(e) {
      if (e.key === 'Escape') handler(e)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [handler, active])
}

/** Fires when a pointerdown lands outside every ref in `refs`. */
export function useOnClickOutside(refs, handler, active = true) {
  useEffect(() => {
    if (!active) return
    const list = Array.isArray(refs) ? refs : [refs]
    function onPointerDown(e) {
      if (list.some(r => r.current?.contains(e.target))) return
      handler(e)
    }
    // `pointerdown` rather than `click`: a click that starts inside and ends outside (a drag on a
    // scrollbar or a text selection) shouldn't close the overlay.
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [refs, handler, active])
}
