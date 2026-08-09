import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useAlertStore } from '../../store/alertStore'
import { useUiStore } from '../../store/uiStore'
import { sectionsFor, footerItemsFor, hasTier } from './nav-config'
import NavItem from './NavItem'
import Sheet from '../ui/Sheet'
import Separator from '../ui/Separator'

export default function MobileNavDrawer() {
  const open = useUiStore(s => s.mobileNavOpen)
  const setOpen = useUiStore(s => s.setMobileNavOpen)
  const auth = useAuthStore()
  const unreadCount = useAlertStore(s => s.unreadCount)
  const { pathname } = useLocation()

  // A route change is the clearest signal the user is done with the drawer.
  useEffect(() => { setOpen(false) }, [pathname, setOpen])

  const sections = sectionsFor(auth)
  const footerItems = footerItemsFor(auth)

  return (
    <Sheet open={open} onOpenChange={setOpen} side='left' size='17.5rem' label='Primary navigation'>
      <div className='h-14 flex items-center justify-between px-4 border-b border-border shrink-0'>
        <span className='text-base font-bold text-fg'>Clarity Fleet</span>
        <button
          type='button' onClick={() => setOpen(false)} aria-label='Close menu'
          className='size-8 rounded-control inline-flex items-center justify-center text-fg-muted
                     hover:bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring'
        >
          <X className='size-4' aria-hidden='true' />
        </button>
      </div>

      <nav className='flex-1 overflow-y-auto py-3'>
        {sections.map((section, i) => (
          <div key={section.id} className={i > 0 ? 'mt-1' : ''}>
            {section.label && (
              <div className='mx-6 mt-4 mb-1.5'><Separator label={section.label} /></div>
            )}
            <div className='space-y-0.5'>
              {section.items.map(item => (
                <NavItem
                  key={item.to}
                  {...item}
                  locked={item.tier ? !hasTier(auth.subscriptionTier, item.tier) : false}
                  lockedTier={item.tier}
                  badge={item.badge === 'alerts' ? unreadCount : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className='shrink-0 border-t border-border p-2 space-y-0.5'>
        {footerItems.map(item => <NavItem key={item.to} {...item} />)}
      </div>
    </Sheet>
  )
}
