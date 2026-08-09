import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useAlertStore } from '../../store/alertStore'
import { useUiStore } from '../../store/uiStore'
import { sectionsFor, footerItemsFor, hasTier } from './nav-config'
import NavItem from './NavItem'
import Separator from '../ui/Separator'
import Tooltip from '../ui/Tooltip'

export default function Sidebar() {
  const auth = useAuthStore()
  const unreadCount = useAlertStore(s => s.unreadCount)
  const collapsed = useUiStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUiStore(s => s.toggleSidebar)

  const sections = sectionsFor(auth)
  const footerItems = footerItemsFor(auth)

  return (
    <aside
      aria-label='Primary'
      style={{ width: 'var(--sidebar-w)' }}
      className='hidden md:flex flex-col fixed left-0 top-0 h-full bg-surface border-r border-border z-40 transition-[width] duration-200 ease-out'
    >
      <div className='h-(--topbar-h) flex items-center px-4 border-b border-border shrink-0'>
        {collapsed ? (
          <span className='mx-auto size-7 rounded-control bg-accent text-fg-on-accent flex items-center justify-center font-bold text-sm' aria-hidden='true'>
            C
          </span>
        ) : (
          <span className='text-base font-bold text-fg tracking-tight px-2'>Clarity Fleet</span>
        )}
      </div>

      <nav className='flex-1 overflow-y-auto overflow-x-hidden py-3 min-h-0'>
        {sections.map((section, i) => (
          <div key={section.id} className={i > 0 ? 'mt-1' : ''}>
            {section.label && !collapsed && (
              <div className='mx-6 mt-4 mb-1.5'>
                <Separator label={section.label} />
              </div>
            )}
            {section.label && collapsed && <Separator className='mx-3 my-3' />}
            <div className='space-y-0.5'>
              {section.items.map(item => (
                <NavItem
                  key={item.to}
                  {...item}
                  collapsed={collapsed}
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
        {footerItems.map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}

        <Tooltip side='right' content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} disabled={false}>
          <button
            type='button'
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-keyshortcuts='['
            className='w-full flex items-center gap-3 px-3 h-9 rounded-control text-sm font-medium
                       text-fg-subtle hover:bg-surface-2 hover:text-fg transition-colors outline-none
                       focus-visible:ring-2 focus-visible:ring-ring justify-start'
          >
            {collapsed
              ? <PanelLeftOpen className='size-4.5 mx-auto' aria-hidden='true' />
              : <><PanelLeftClose className='size-4.5 shrink-0' aria-hidden='true' /> Collapse</>}
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
