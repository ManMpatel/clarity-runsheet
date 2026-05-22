import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

const links = [
  { to: '/admin',           label: 'Companies',       exact: true },
  { to: '/admin/tickets',   label: 'Support Tickets' },
  { to: '/admin/devices',   label: 'IMEI Overview' },
]

export default function AdminShell() {
  const logout   = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/admin/login')
  }

  return (
    <div className='min-h-screen bg-gray-50 flex'>
      <aside className='fixed left-0 top-0 h-full w-60 bg-white border-r border-gray-200 flex flex-col z-40'>
        <div className='h-[60px] flex items-center px-6 border-b border-gray-200'>
          <div>
            <span className='text-base font-bold text-purple-600'>Clarity Fleet</span>
            <p className='text-xs text-gray-400 leading-none mt-0.5'>Super Admin</p>
          </div>
        </div>

        <nav className='flex-1 overflow-y-auto py-4'>
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.exact}
              className={({ isActive }) =>
                `flex items-center px-6 py-2.5 text-sm font-medium border-l-4 transition-colors ${
                  isActive
                    ? 'border-purple-500 bg-purple-50 text-purple-600'
                    : 'border-transparent text-gray-600 hover:bg-gray-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className='p-4 border-t border-gray-200'>
          <button
            onClick={handleLogout}
            className='w-full h-9 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition font-medium'
          >
            Logout
          </button>
        </div>
      </aside>

      <main className='ml-60 flex-1 min-h-screen'>
        <div className='h-[60px] bg-white border-b border-gray-200 flex items-center px-8 justify-between'>
          <span className='text-sm text-gray-500'>Admin Panel</span>
          <span className='text-xs text-gray-400'>admin@claritysoftware.au</span>
        </div>
        <div className='p-8'>
          <Outlet />
        </div>
      </main>
    </div>
  )
}

