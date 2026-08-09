import { Menu, Search } from 'lucide-react'
import { useUiStore } from '../../store/uiStore'
import { usePaletteStore } from '../../store/paletteStore'
import usePageMeta from '../../hooks/usePageMeta'
import Kbd from '../ui/Kbd'
import ConnectionIndicator from './ConnectionIndicator'
import NotificationBell from './NotificationBell'
import UserMenu from './UserMenu'

export default function Topbar() {
  const { title } = usePageMeta()
  const setMobileNavOpen = useUiStore(s => s.setMobileNavOpen)
  const setPaletteOpen = usePaletteStore(s => s.setOpen)

  return (
    <header
      className='sticky top-0 z-30 h-(--topbar-h) shrink-0 flex items-center gap-3 px-4 sm:px-6
                 border-b border-border bg-surface/80 backdrop-blur-md'
    >
      <button
        type='button'
        onClick={() => setMobileNavOpen(true)}
        aria-label='Open menu'
        className='md:hidden size-9 -ml-1.5 rounded-control inline-flex items-center justify-center
                   text-fg-muted hover:bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <Menu className='size-5' aria-hidden='true' />
      </button>

      <h1 className='text-sm font-semibold text-fg truncate'>{title}</h1>

      <button
        type='button'
        onClick={() => setPaletteOpen(true)}
        className='hidden md:flex items-center gap-2 h-8 w-64 ml-4 px-2.5 rounded-control
                   border border-border text-fg-subtle text-xs hover:border-border-strong
                   transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <Search className='size-3.5 shrink-0' aria-hidden='true' />
        <span className='flex-1 text-left'>Search…</span>
        <Kbd>⌘K</Kbd>
      </button>

      {/* Spacer: fills the remaining width so the icon cluster below always sits at the far
          right, regardless of whether the desktop search box above is present. */}
      <div className='flex-1' />

      <button
        type='button'
        onClick={() => setPaletteOpen(true)}
        aria-label='Search'
        className='md:hidden size-9 rounded-control inline-flex items-center justify-center
                   text-fg-muted hover:bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring'
      >
        <Search className='size-4.5' aria-hidden='true' />
      </button>

      <div className='flex items-center gap-1'>
        <ConnectionIndicator />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
