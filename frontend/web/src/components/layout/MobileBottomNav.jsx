import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useAlertStore } from '../../store/alertStore'
import { sectionsFor, footerItemsFor } from './nav-config'
import { cn } from '../../lib/cn'

/**
 * Rebuilt on nav-config so this can never drift from the sidebar again — previously the 5 tabs
 * here, the sidebar's link arrays, and Settings' own nav were three hand-typed lists.
 */
export default function MobileBottomNav() {
  const auth = useAuthStore()
  const unreadCount = useAlertStore(s => s.unreadCount)

  const tabs = [...sectionsFor(auth).flatMap(s => s.items), ...footerItemsFor(auth)]
    .filter(i => i.mobile)
    .slice(0, 5)

  return (
    <nav
      aria-label='Primary'
      className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border z-40
                 flex pb-[env(safe-area-inset-bottom)]'
    >
      {tabs.map(tab => {
        const Icon = tab.icon
        const badge = tab.badge === 'alerts' ? unreadCount : 0
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                'relative flex-1 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-accent' : 'text-fg-subtle'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  aria-hidden='true'
                  className={cn(
                    'absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full transition-opacity',
                    isActive ? 'bg-accent opacity-100' : 'opacity-0'
                  )}
                />
                <span className='relative'>
                  <Icon className='size-5' aria-hidden='true' />
                  {badge > 0 && (
                    <span
                      className='absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-danger
                                 text-white text-[9px] font-bold flex items-center justify-center tabular'
                      aria-hidden='true'
                    />
                  )}
                </span>
                {tab.label}
              </>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}
