import { Outlet, useLocation } from 'react-router-dom'
import { useUiStore } from '../../store/uiStore'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import MobileNavDrawer from './MobileNavDrawer'
import MobileBottomNav from './MobileBottomNav'
import VerificationBanner from './VerificationBanner'
import CommandPalette from './CommandPalette'
import ErrorBoundary from './ErrorBoundary'
import { useFleetSocket } from '../../hooks/useSocket'
import { useAlertStore } from '../../store/alertStore'

export default function AppShell() {
  const collapsed = useUiStore(s => s.sidebarCollapsed)
  const { pathname } = useLocation()
  const addAlert = useAlertStore(s => s.addAlert)

  // `alert:new` has been broadcast by the backend since the alerts pipeline was written, with no
  // client ever listening. Subscribing once here — rather than per-page — is what makes the
  // notification bell live everywhere, not just on whichever page happens to fetch alerts.
  useFleetSocket({ onAlert: addAlert })

  return (
    <div
      className='min-h-svh bg-canvas text-fg'
      style={{
        '--sidebar-w': collapsed ? '4rem' : '15rem',
        '--topbar-h': '3.5rem',
        // Consumed by LiveMap and GeofenceManager, which need to fill exactly the space below
        // the sticky topbar. Previously both hardcoded `h-[calc(100vh-60px)] md:h-screen`, which
        // assumed a non-sticky, viewport-fixed header — a sticky topbar in flow overflows that.
        '--content-h': 'calc(100svh - var(--topbar-h))',
      }}
    >
      <a
        href='#main'
        className='sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70]
                   focus:px-3 focus:py-2 focus:rounded-control focus:bg-accent focus:text-fg-on-accent
                   focus:text-sm focus:font-medium'
      >
        Skip to content
      </a>

      <Sidebar />
      <MobileNavDrawer />
      <CommandPalette />

      <div className='flex min-h-svh flex-col transition-[padding-left] duration-200 ease-out md:pl-(--sidebar-w)'>
        <Topbar />
        <VerificationBanner />
        <main
          id='main'
          tabIndex={-1}
          className='flex-1 outline-none pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0'
        >
          <ErrorBoundary key={pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  )
}
