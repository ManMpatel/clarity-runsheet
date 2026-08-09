import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Search, Truck, Sun, Moon, Monitor, LogOut, Plus } from 'lucide-react'
import { usePaletteStore } from '../../store/paletteStore'
import { useAuthStore } from '../../store/authStore'
import { useFleetStore } from '../../store/fleetStore'
import { useUiStore } from '../../store/uiStore'
import { destroySocket } from '../../lib/socket'
import { cn } from '../../lib/cn'
import api from '../../lib/api'
import { allItemsFor } from './nav-config'
import { useFocusTrap, useLockBodyScroll, useEscapeKey } from '../../hooks/overlay'
import Kbd from '../ui/Kbd'

function score(label, query) {
  const l = label.toLowerCase()
  const q = query.toLowerCase()
  if (!q) return 0
  const idx = l.indexOf(q)
  if (idx === -1) return -1
  return idx === 0 ? 100 : 50 - idx
}

/**
 * The outer component stays mounted for the app's whole lifetime (it owns the global Ctrl+K
 * listener, which has to work while closed). The dialog body is a separate component instead,
 * rendered only while `open` — so every open is a fresh mount with query/activeIndex back at
 * their initial values, with no reset-on-open effect needed.
 */
export default function CommandPalette() {
  const open = usePaletteStore(s => s.open)

  useEffect(() => {
    function onKeyDown(e) {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (!isShortcut) return
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
      // Still allow the shortcut to close the palette from its own search input.
      if (typing && !usePaletteStore.getState().open) return
      e.preventDefault()
      usePaletteStore.getState().toggle()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  if (!open) return null
  return <PaletteDialog />
}

function PaletteDialog() {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const navigate = useNavigate()
  const auth = useAuthStore()
  const setTheme = useUiStore(s => s.setTheme)
  const logout = useAuthStore(s => s.logout)
  const getAllVans = useFleetStore(s => s.getAllVans)

  const panelRef = useRef(null)
  const listboxId = useId()

  const close = () => usePaletteStore.getState().setOpen(false)

  useLockBodyScroll(true)
  useFocusTrap(panelRef, true)
  useEscapeKey(close, true)

  async function handleLogout() {
    try { await api.post('/auth/logout') } catch { /* proceed regardless */ }
    destroySocket()
    logout()
    navigate('/login')
  }

  const groups = useMemo(() => {
    const pages = allItemsFor(auth)
      .map(item => ({ id: `page:${item.to}`, label: item.label, icon: item.icon, run: () => navigate(item.to) }))
      .map(item => ({ ...item, score: score(item.label, query) }))
      .filter(item => item.score >= 0)

    const vehicles = getAllVans()
      .map(v => ({
        id: `van:${v.imei}`, label: v.name || v.imei, icon: Truck,
        run: () => navigate(`/live-map?imei=${v.imei}`),
      }))
      .map(item => ({ ...item, score: score(item.label, query) }))
      .filter(item => item.score >= 0)

    const actions = [
      { id: 'action:add-vehicle', label: 'Add vehicle', icon: Plus, run: () => navigate('/settings?tab=vehicles') },
      { id: 'action:theme-light', label: 'Switch to light theme', icon: Sun, run: () => setTheme('light') },
      { id: 'action:theme-dark', label: 'Switch to dark theme', icon: Moon, run: () => setTheme('dark') },
      { id: 'action:theme-system', label: 'Match system theme', icon: Monitor, run: () => setTheme('system') },
      { id: 'action:logout', label: 'Sign out', icon: LogOut, run: handleLogout },
    ]
      .map(item => ({ ...item, score: score(item.label, query) }))
      .filter(item => item.score >= 0)

    const sort = (a, b) => b.score - a.score
    return [
      { label: 'Pages', items: pages.sort(sort).slice(0, 6) },
      { label: 'Vehicles', items: vehicles.sort(sort).slice(0, 5) },
      { label: 'Actions', items: actions.sort(sort).slice(0, 5) },
    ].filter(g => g.items.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleLogout is stable enough here
  }, [query, auth, getAllVans, navigate, setTheme])

  const flatItems = useMemo(() => groups.flatMap(g => g.items), [groups])

  function onQueryChange(value) {
    setQuery(value)
    // Reset selection here, inside the event handler that caused the list to change, rather than
    // in an effect keyed on `query` — same outcome, no synchronous setState-in-effect.
    setActiveIndex(0)
  }

  function run(item) {
    if (!item) return
    close()
    item.run()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flatItems.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter')     { e.preventDefault(); run(flatItems[activeIndex]) }
  }

  return createPortal(
    <div className='fixed inset-0 z-60 flex items-start justify-center pt-[15vh] p-4'>
      <div className='absolute inset-0 bg-overlay' onClick={close} aria-hidden='true' />
      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-label='Command palette'
        className='relative w-full max-w-lg bg-surface border border-border rounded-modal shadow-modal
                   motion-safe:animate-[pop-in_120ms_ease-out] overflow-hidden'
      >
        <div className='flex items-center gap-2.5 px-4 h-12 border-b border-border'>
          <Search className='size-4 text-fg-subtle shrink-0' aria-hidden='true' />
          <input
            autoFocus
            role='combobox'
            aria-expanded='true'
            aria-controls={listboxId}
            aria-activedescendant={flatItems[activeIndex]?.id}
            value={query}
            onChange={e => onQueryChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder='Search pages, vehicles, actions…'
            className='flex-1 bg-transparent text-sm outline-none placeholder:text-fg-subtle text-fg'
          />
          <Kbd>Esc</Kbd>
        </div>

        <div id={listboxId} role='listbox' aria-label='Results' className='max-h-80 overflow-y-auto p-1.5'>
          {flatItems.length === 0 && (
            <p className='text-sm text-fg-muted text-center py-8'>No results for "{query}"</p>
          )}
          {groups.map(group => (
            <div key={group.label} className='mb-1 last:mb-0'>
              <p className='px-2.5 pt-2 pb-1 text-[11px] font-semibold text-fg-subtle uppercase tracking-wider'>
                {group.label}
              </p>
              {group.items.map(item => {
                const idx = flatItems.indexOf(item)
                const active = idx === activeIndex
                const Icon = item.icon
                return (
                  <button
                    key={item.id}
                    id={item.id}
                    role='option'
                    aria-selected={active}
                    type='button'
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => run(item)}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-control text-sm text-left transition-colors',
                      active ? 'bg-accent-soft text-accent-fg' : 'text-fg-muted hover:bg-surface-2'
                    )}
                  >
                    {Icon && <Icon className='size-4 shrink-0' aria-hidden='true' />}
                    {item.label}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  )
}
