import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/dashboard',        label: 'Home' },
  { to: '/live-map',         label: 'Map' },
  { to: '/alerts',           label: 'Alerts' },
  { to: '/trips',            label: 'Trips' },
  { to: '/settings',         label: 'Settings' },
]

export default function MobileBottomNav() {
  return (
    <nav className='md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-40 flex'>
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center text-xs font-medium transition-colors ${
              isActive
                ? 'text-blue-600'
                : 'text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}