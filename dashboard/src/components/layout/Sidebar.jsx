import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { useEffect, useState } from 'react'
import api from '../../lib/api'
import {
  ChartBarIcon,
  MapIcon,
  ClipboardIcon as ClipboardListIcon,
  BellIcon,
  TruckIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  AdjustmentsIcon as WrenchIcon,
  HeartIcon,
  DocumentTextIcon as DocumentReportIcon,
  CogIcon,
  PhotographIcon as QrcodeIcon,
  LightningBoltIcon,
  DeviceMobileIcon,
  CreditCardIcon,
} from '@heroicons/react/outline'

const CORE_LINKS = [
  { to: '/dashboard', label: 'Dashboard',      icon: ChartBarIcon },
  { to: '/live-map',  label: 'Live Map',        icon: MapIcon },
  { to: '/trips',     label: 'Trips & History', icon: ClipboardListIcon },
  { to: '/alerts',    label: 'Alerts',          icon: BellIcon },
]

const MID_LINKS = [
  { to: '/driver-behaviour', label: 'Driver Behaviour',  icon: TruckIcon },
  { to: '/geofences',        label: 'Geofence Manager',  icon: ShieldCheckIcon },
  { to: '/fbt',              label: 'FBT Logbook',       icon: BookOpenIcon },
  { to: '/maintenance',      label: 'Maintenance',       icon: WrenchIcon },
]

const TOP_LINKS = [
  { to: '/vehicle-health', label: 'Vehicle Health', icon: HeartIcon },
  { to: '/reports',        label: 'Reports',         icon: DocumentReportIcon },
]

const GARAGE_LINKS = [
  { to: '/garage/imei-check',      label: 'IMEI Pre-Check',  icon: QrcodeIcon },
  { to: '/garage/register-device', label: 'Register Device', icon: LightningBoltIcon },
  { to: '/garage/my-devices',      label: 'My Devices',      icon: DeviceMobileIcon },
  { to: '/settings',               label: 'Settings',        icon: CogIcon },
]

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-blue-50 dark:bg-blue-950 text-blue-600'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`
      }>
      {Icon && <Icon className='w-[18px] h-[18px] flex-shrink-0' />}
      {label}
    </NavLink>
  )
}

function LockedItem({ label, plan, icon: Icon }) {
  const navigate = useNavigate()
  const [tip, setTip] = useState(false)

  return (
    <div className='relative'>
      <button
        onClick={() => navigate('/settings')}
        onMouseEnter={() => setTip(true)}
        onMouseLeave={() => setTip(false)}
        className='w-full flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'>
        {Icon && <Icon className='w-[18px] h-[18px] flex-shrink-0' />}
        <span className='flex-1 text-left'>{label}</span>
        <span className='text-xs'>🔒</span>
      </button>
      {tip && (
        <div className='absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl pointer-events-none'>
          Requires {plan} plan — click to upgrade
          <div className='absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900' />
        </div>
      )}
    </div>
  )
}

function SectionLabel({ label }) {
  return (
    <div className='mx-6 mt-5 mb-2 flex items-center gap-2'>
      <span className='text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider whitespace-nowrap'>
        {label}
      </span>
      <div className='flex-1 h-px bg-gray-100 dark:bg-gray-800' />
    </div>
  )
}

export default function Sidebar() {
  const role = useAuthStore(s => s.role)
  const [hasMid, setHasMid] = useState(false)
  const [hasTop, setHasTop] = useState(false)

  const subscriptionTier = useAuthStore(s => s.subscriptionTier)

  useEffect(() => {
    if (role === 'garageOwner') return
    if (subscriptionTier === 'top') { setHasMid(true); setHasTop(true); return }
    if (subscriptionTier === 'mid') { setHasMid(true); setHasTop(false); return }
    api.get('/api/vehicles')
      .then(res => {
        const v = res.data
        setHasMid(v.some(x => x.tier === 'mid' || x.tier === 'top'))
        setHasTop(v.some(x => x.tier === 'top'))
      })
      .catch(() => {})
  }, [role, subscriptionTier])

  if (role === 'garageOwner') {
    return (
      <aside className='hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40'>
        <div className='h-[60px] flex items-center px-6 border-b border-gray-200 dark:border-gray-800'>
          <div>
            <span className='text-lg font-bold text-blue-600'>Clarity Fleet</span>
            <p className='text-xs text-gray-400 mt-0.5'>Garage Portal</p>
          </div>
        </div>
        <nav className='flex-1 overflow-y-auto py-3'>
          {GARAGE_LINKS.map(l => <NavItem key={l.to} {...l} />)}
        </nav>
      </aside>
    )
  }

  return (
    <aside className='hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40'>
      <div className='h-[60px] flex items-center px-6 border-b border-gray-200 dark:border-gray-800'>
        <span className='text-lg font-bold text-blue-600'>Clarity Fleet</span>
      </div>

      <nav className='flex-1 overflow-y-auto py-3'>

        {/* Core — always visible */}
        {CORE_LINKS.map(l => <NavItem key={l.to} {...l} />)}

        {/* Mid features */}
        <SectionLabel label='Mid Plan' />
        {MID_LINKS.map(l =>
          hasMid
            ? <NavItem key={l.to} {...l} />
            : <LockedItem key={l.to} label={l.label} plan='Mid' />
        )}

        {/* Top features */}
        <SectionLabel label='Top Plan' />
        {TOP_LINKS.map(l =>
          hasTop
            ? <NavItem key={l.to} {...l} />
            : <LockedItem key={l.to} label={l.label} plan='Top' />
        )}

        {/* Bottom */}
        <div className='mx-6 mt-5 mb-2 h-px bg-gray-100 dark:bg-gray-800' />
        <NavItem to='/settings' label='Settings' />

        {role === 'superAdmin' && (
          <NavLink to='/admin'
            className={({ isActive }) =>
              `flex items-center px-6 py-2.5 text-sm font-medium border-l-4 transition-colors ${
                isActive
                  ? 'border-purple-500 bg-purple-50 text-purple-600'
                  : 'border-transparent text-purple-600 hover:bg-purple-50'
              }`
            }>
            Super Admin Panel
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
