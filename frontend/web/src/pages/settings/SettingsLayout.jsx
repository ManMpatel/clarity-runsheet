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
import Billing           from '../Billing'
import AppearanceSection from './AppearanceSection'
import AlertsSection from './AlertsSection'


const NAV = [
  { id: 'profile',    label: 'Profile',    icon: '👤' },
  { id: 'company',    label: 'Company',    icon: '🏢' },
  { id: 'vehicles',   label: 'Vehicles',   icon: '🚐' },
  { id: 'users',      label: 'Users',      icon: '👥' },
  { id: 'plan',       label: 'My Plan',    icon: '📊' },
  { id: 'upgrade',    label: 'Upgrade',    icon: '⬆️' },
  { id: 'appearance', label: 'Appearance', icon: '🎨' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
]

export default function SettingsLayout() {
  const navigate = useNavigate()
  const logout   = useAuthStore(s => s.logout)
  const [section, setSection] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('tab') || 'profile'
  })
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
          api.get('/auth/me'),
          api.get('/settings/company'),
          api.get('/settings/users'),
          api.get('/vehicles'),
        ])
        setMe(meRes.data)
        setCompany(cRes.data)
        setUsers(uRes.data)
        setVehicles(vRes.data)
        // Was previously dead code (`const sRes = null`) — the My Plan page always showed 0/0
        // slot usage for every tier. Company already carries flat entrySlots/midSlots/topSlots
        // (Postgres schema), and vehicle tier counts are derivable from the vehicles already
        // fetched above — no separate endpoint needed.
        const company = cRes.data
        const activeVehicles = (vRes.data || []).filter(v => v.active)
        setSlots({
          slots: {
            entrySlots: company?.entrySlots || 0,
            midSlots: company?.midSlots || 0,
            topSlots: company?.topSlots || 0,
          },
          used: {
            entry: activeVehicles.filter(v => v.tier === 'entry').length,
            mid: activeVehicles.filter(v => v.tier === 'mid').length,
            top: activeVehicles.filter(v => v.tier === 'top').length,
          },
        })
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleLogout() {
    // Was `setDone(true)` — an undefined reference that threw a ReferenceError before the
    // redirect could run, leaving the user on a logged-out-but-still-rendered Settings page.
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error(err.message)
    }
    logout()
    navigate('/login')
  }

  const sharedProps = { me, setMe, company, setCompany, vehicles, setVehicles, users, setUsers, slots, loading }

  return (
    <div className='flex flex-col'>
      {/* This page's own "Settings" header bar was removed here — the shell's sticky Topbar now
          shows the page title (see components/layout/nav-config.js), so this would have doubled
          up. min-h-screen on the aside below was also swapped for the shell's --content-h token;
          under the old fixed-position Header, min-h-screen was correct, but the Topbar now sits
          in normal flow, so min-h-screen overshoots by one topbar height on every route. */}
      <div className='flex flex-1'>
      <aside className='w-56 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 min-h-(--content-h) flex flex-col'>
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
        {section === 'billing'    && <Billing />}
        {section === 'appearance' && <AppearanceSection {...sharedProps} />}
        {section === 'alerts' && <AlertsSection />}

      </main>
    </div>
    </div>
  )
}