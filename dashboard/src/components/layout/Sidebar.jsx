import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const contractorLinks = [
  { to: '/dashboard',        label: 'Dashboard' },
  { to: '/live-map',         label: 'Live Map' },
  { to: '/trips',            label: 'Trips & History' },
  { to: '/driver-behaviour', label: 'Driver Behaviour' },
  { to: '/vehicle-health',   label: 'Vehicle Health' },
  { to: '/maintenance',      label: 'Maintenance' },
  { to: '/geofences',        label: 'Geofence Manager' },
  { to: '/alerts',           label: 'Alerts' },
  { to: '/reports',          label: 'Reports' },
  { to: '/fbt',              label: 'FBT Logbook' },
  { to: '/settings', label: 'Settings' },
]

const garageLinks = [
  { to: '/garage/imei-check',     label: 'IMEI Pre-Check' },
  { to: '/garage/register-device', label: 'Register Device' },
  { to: '/garage/my-devices',     label: 'My Devices' },
  { to: '/settings', label: 'Settings' },
]

export default function Sidebar() {
  const role = useAuthStore(s => s.role)

  const links = role === 'garageOwner' ? garageLinks : contractorLinks

  return (
    <aside className='hidden md:flex flex-col fixed left-0 top-0 h-full w-60 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-40'>
      <div className='h-[60px] flex items-center px-6 border-b border-gray-200 dark:border-gray-800'>
        <div>
          <span className='text-lg font-bold text-blue-600'>Clarity Fleet</span>
          {role === 'garageOwner' && (
            <p className='text-xs text-gray-400 leading-none mt-0.5'>Garage Portal</p>
          )}
        </div>
      </div>

      <nav className='flex-1 overflow-y-auto py-4'>
        {links.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center px-6 py-2.5 text-sm font-medium border-l-4 transition-colors ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}

        {role === 'superAdmin' && (
          <div className='mt-4 pt-4 border-t border-gray-200 dark:border-gray-800'>
            <NavLink
              to='/admin'
              className={({ isActive }) =>
                `flex items-center px-6 py-2.5 text-sm font-medium border-l-4 transition-colors ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                    : 'border-transparent text-purple-600 hover:bg-purple-50'
                }`
              }
            >
              Super Admin Panel
            </NavLink>
          </div>
        )}
      </nav>
    </aside>
  )
}
