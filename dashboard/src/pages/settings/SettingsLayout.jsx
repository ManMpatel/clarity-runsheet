import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../lib/api'
import ProfileSection    from './ProfileSection'
import CompanySection    from './CompanySection'
import VehiclesSection   from './VehiclesSection'
import UsersSection      from './UsersSection'
import PlanSection       from './PlanSection'
import UpgradeSection    from './UpgradeSection'
import AppearanceSection from './AppearanceSection'

const NAV = [
  { id: 'profile',    label: 'Profile',    icon: '👤' },
  { id: 'company',    label: 'Company',    icon: '🏢' },
  { id: 'vehicles',   label: 'Vehicles',   icon: '🚐' },
  { id: 'users',      label: 'Users',      icon: '👥' },
  { id: 'plan',       label: 'My Plan',    icon: '📊' },
  { id: 'upgrade',    label: 'Upgrade',    icon: '⬆️' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
]

export default function SettingsLayout() {
  const navigate = useNavigate()
  const logout   = useAuthStore(s => s.logout)
  const [section, setSection] = useState('profile')
  const [loading, setLoading] = useState(true)
  const [me, setMe]           = useState(null)
  const [company, setCompany] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers]     = useState([])
  const [slots, setSlots]     = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [meRes, cRes, uRes, vRes] = await Promise.all([
          api.get('/api/auth/me'),
          api.get('/api/settings/company'),
          api.get('/api/settings/users'),
          api.get('/api/vehicles'),
        ])
        setMe(meRes.data)
        setCompany(cRes.data)
        setUsers(uRes.data)
        setVehicles(vRes.data)
        const sRes = await api.get(`/api/admin/companies/${cRes.data._id}/slots`).catch(() => null)
        if (sRes) setSlots(sRes.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const sharedProps = { me, company, setCompany, vehicles, setVehicles, users, setUsers, slots, loading }

  return (
    <div className='flex'>
      <aside className='w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-screen flex flex-col'>
        {me && (
          <div className='p-4 border-b border-gray-200 dark:border-gray-800'>
            <div className='flex items-center gap-2.5'>
              <div className='w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
                {me.name?.charAt(0)?.toUpperCase()}
              </div>
              <div className='min-w-0'>
                <p className='text-sm font-semibold text-gray-900 dark:text-white truncate'>{me.name}</p>
                <p className={`text-xs font-medium ${me.emailVerified ? 'text-green-600' : 'text-amber-500'}`}>
                  {me.emailVerified ? '✓ Verified' : '⚠ Unverified'}
                </p>
              </div>
            </div>
          </div>
        )}

        <nav className='flex-1 py-2 px-2'>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                section === n.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className='text-base'>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        <div className='p-2 border-t border-gray-200 dark:border-gray-800'>
          <button
            onClick={handleLogout}
            className='w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
          >
            <span>🚪</span> Log out
          </button>
        </div>
      </aside>

      <main className='flex-1 p-8 max-w-2xl'>
        {section === 'profile'    && <ProfileSection    {...sharedProps} />}
        {section === 'company'    && <CompanySection    {...sharedProps} />}
        {section === 'vehicles'   && <VehiclesSection   {...sharedProps} />}
        {section === 'users'      && <UsersSection      {...sharedProps} />}
        {section === 'plan'       && <PlanSection       {...sharedProps} />}
        {section === 'upgrade'    && <UpgradeSection    {...sharedProps} />}
        {section === 'appearance' && <AppearanceSection {...sharedProps} />}
      </main>
    </div>
  )
}
