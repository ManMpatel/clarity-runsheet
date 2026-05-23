import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import api from '../lib/api'

const NAV = [
  { id: 'profile',    label: 'Profile',     icon: '👤' },
  { id: 'company',    label: 'Company',     icon: '🏢' },
  { id: 'vehicles',   label: 'Vehicles',    icon: '🚐' },
  { id: 'users',      label: 'Users',       icon: '👥' },
  { id: 'billing',    label: 'Billing',     icon: '💳' },
  { id: 'appearance', label: 'Appearance',  icon: '🎨' },
]

export default function Settings() {
  const navigate   = useNavigate()
  const logout     = useAuthStore(s => s.logout)
  const authUser   = useAuthStore(s => s.user)
  const { darkMode, toggleDarkMode } = useUiStore()

  const [section, setSection]   = useState('profile')
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const [me, setMe]             = useState(null)
  const [company, setCompany]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers]       = useState([])
  const [slots, setSlots]       = useState(null)

  const [companyForm, setCompanyForm] = useState({ name: '', phone: '', address: '' })
  const [showAddVan, setShowAddVan]   = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [vanForm, setVanForm]   = useState({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'fleetManager' })

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
        setCompanyForm({ name: cRes.data.name || '', phone: cRes.data.phone || '', address: cRes.data.address || '' })
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

  async function saveCompany() {
    setSaving(true)
    try {
      const res = await api.put('/api/settings/company', companyForm)
      setCompany(res.data)
    } catch (err) { console.error(err.message) }
    finally { setSaving(false) }
  }

  async function addVan() {
    try {
      const res = await api.post('/api/vehicles', vanForm)
      setVehicles(v => [...v, res.data])
      setShowAddVan(false)
      setVanForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
    } catch (err) { console.error(err.message) }
  }

  async function addUser() {
    try {
      const res = await api.post('/api/settings/users', userForm)
      setUsers(u => [...u, res.data])
      setShowAddUser(false)
      setUserForm({ name: '', email: '', password: '', role: 'fleetManager' })
    } catch (err) { console.error(err.message) }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const entryTotal = slots?.slots?.entrySlots || 0
  const midTotal   = slots?.slots?.midSlots   || 0
  const topTotal   = slots?.slots?.topSlots   || 0
  const monthly    = (entryTotal * 18) + (midTotal * 25) + (topTotal * 45)

  if (loading) return (
    <div className='flex items-center justify-center h-64'>
      <p className='text-sm text-gray-400'>Loading...</p>
    </div>
  )

  return (
    <div className='flex min-h-screen bg-gray-50 dark:bg-gray-950'>

      {/* Sidebar */}
      <aside className='w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col fixed top-0 left-60 h-full z-10'>
        {/* Profile card */}
        <div className='p-5 border-b border-gray-200 dark:border-gray-800'>
          <div className='flex items-center gap-3'>
            <div className='w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0'>
              {me?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className='min-w-0'>
              <p className='text-sm font-semibold text-gray-900 dark:text-white truncate'>{me?.name}</p>
              <p className='text-xs text-gray-500 truncate'>{me?.email}</p>
              <span className={`inline-flex items-center gap-1 text-xs mt-0.5 font-medium ${
                me?.emailVerified ? 'text-green-600' : 'text-amber-500'
              }`}>
                {me?.emailVerified ? '✓ Verified' : '⚠ Unverified'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className='flex-1 py-3 px-2'>
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setSection(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                section === n.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span>{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className='p-3 border-t border-gray-200 dark:border-gray-800'>
          <button
            onClick={handleLogout}
            className='w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
          >
            <span>🚪</span> Log out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className='ml-64 flex-1 p-8'>
        <div className='max-w-2xl'>

          {/* PROFILE */}
          {section === 'profile' && (
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Profile</h1>
              <p className='text-sm text-gray-500 mb-6'>Your account information</p>
              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-500 mb-0.5'>Full name</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>{me?.name}</p>
                  </div>
                </div>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-500 mb-0.5'>Email address</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>{me?.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    me?.emailVerified
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {me?.emailVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-500 mb-0.5'>Role</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white capitalize'>{me?.role}</p>
                  </div>
                </div>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <div>
                    <p className='text-xs text-gray-500 mb-0.5'>Member since</p>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>
                      {me?.createdAt ? new Date(me.createdAt).toLocaleDateString('en-AU') : '—'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* COMPANY */}
          {section === 'company' && (
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Company</h1>
              <p className='text-sm text-gray-500 mb-6'>Your business details</p>
              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4'>
                {[
                  { label: 'Company name', key: 'name', placeholder: 'Your company name' },
                  { label: 'Phone number', key: 'phone', placeholder: '+61 4XX XXX XXX' },
                  { label: 'Address', key: 'address', placeholder: '123 Main St, Sydney NSW 2000' },
                ].map(f => (
                  <div key={f.key}>
                    <label className='block text-xs font-medium text-gray-500 mb-1.5'>{f.label}</label>
                    <input
                      value={companyForm[f.key]}
                      onChange={e => setCompanyForm(c => ({ ...c, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  </div>
                ))}
                <button
                  onClick={saveCompany}
                  disabled={saving}
                  className='h-10 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition'
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </div>
          )}

          {/* VEHICLES */}
          {section === 'vehicles' && (
            <div>
              <div className='flex items-center justify-between mb-6'>
                <div>
                  <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Vehicles</h1>
                  <p className='text-sm text-gray-500'>{vehicles.length} registered</p>
                </div>
                <button
                  onClick={() => setShowAddVan(true)}
                  className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition'
                >
                  + Add van
                </button>
              </div>

              {showAddVan && (
                <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4 space-y-3'>
                  <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>New vehicle</h3>
                  {[
                    { key: 'name', placeholder: 'Van 1 — John\'s HiAce' },
                    { key: 'imei', placeholder: '15-digit IMEI' },
                    { key: 'registration', placeholder: 'ABC123' },
                    { key: 'make', placeholder: 'Toyota' },
                    { key: 'model', placeholder: 'HiAce' },
                    { key: 'year', placeholder: '2022' },
                  ].map(f => (
                    <input
                      key={f.key}
                      value={vanForm[f.key]}
                      onChange={e => setVanForm(v => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  ))}
                  <div className='flex gap-2'>
                    <button onClick={addVan} className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
                    <button onClick={() => setShowAddVan(false)} className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
                  </div>
                </div>
              )}

              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
                {vehicles.length === 0 ? (
                  <p className='text-sm text-gray-400 p-6 text-center'>No vehicles yet</p>
                ) : vehicles.map((v, i) => (
                  <div key={i} className='px-5 py-3.5 flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{v.name}</p>
                      <p className='text-xs text-gray-400'>{v.registration || 'No rego'} · {v.imei}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                      v.tier === 'mid' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {v.tier || 'entry'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {section === 'users' && (
            <div>
              <div className='flex items-center justify-between mb-6'>
                <div>
                  <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Users</h1>
                  <p className='text-sm text-gray-500'>{users.length} team members</p>
                </div>
                <button
                  onClick={() => setShowAddUser(true)}
                  className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition'
                >
                  + Add user
                </button>
              </div>

              {showAddUser && (
                <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4 space-y-3'>
                  <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>New user</h3>
                  {[
                    { key: 'name', placeholder: 'Full name' },
                    { key: 'email', placeholder: 'Email address' },
                    { key: 'password', placeholder: 'Password' },
                  ].map(f => (
                    <input
                      key={f.key}
                      type={f.key === 'password' ? 'password' : 'text'}
                      value={userForm[f.key]}
                      onChange={e => setUserForm(u => ({ ...u, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                    />
                  ))}
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm(u => ({ ...u, role: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none'
                  >
                    <option value='fleetManager'>Fleet Manager</option>
                    <option value='companyAdmin'>Company Admin</option>
                  </select>
                  <div className='flex gap-2'>
                    <button onClick={addUser} className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
                    <button onClick={() => setShowAddUser(false)} className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
                  </div>
                </div>
              )}

              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
                {users.length === 0 ? (
                  <p className='text-sm text-gray-400 p-6 text-center'>No users yet</p>
                ) : users.map((u, i) => (
                  <div key={i} className='px-5 py-3.5 flex items-center justify-between'>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-white'>{u.name}</p>
                      <p className='text-xs text-gray-400'>{u.email}</p>
                    </div>
                    <span className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize'>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BILLING */}
          {section === 'billing' && (
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Billing</h1>
              <p className='text-sm text-gray-500 mb-6'>Your current plan and usage</p>
              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Current plan</p>
                  <span className='text-sm font-semibold text-gray-900 dark:text-white capitalize'>
                    {company?.subscriptionTier || 'locked'}
                  </span>
                </div>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <p className='text-sm text-gray-600 dark:text-gray-400'>Monthly total</p>
                  <span className='text-sm font-semibold text-gray-900 dark:text-white'>${monthly}/mo</span>
                </div>
                <div className='px-6 py-4'>
                  <p className='text-xs text-gray-500 mb-3'>Slot usage</p>
                  {[
                    { label: 'Entry — $18/van', used: slots?.used?.entry || 0, total: entryTotal },
                    { label: 'Mid — $25/van',   used: slots?.used?.mid   || 0, total: midTotal },
                    { label: 'Top — $45/van',   used: slots?.used?.top   || 0, total: topTotal },
                  ].map(s => (
                    <div key={s.label} className='mb-3'>
                      <div className='flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1'>
                        <span>{s.label}</span>
                        <span>{s.used} / {s.total}</span>
                      </div>
                      <div className='h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden'>
                        <div
                          className='h-full bg-blue-500 rounded-full'
                          style={{ width: s.total > 0 ? `${(s.used / s.total) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {section === 'appearance' && (
            <div>
              <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Appearance</h1>
              <p className='text-sm text-gray-500 mb-6'>Customise how Clarity Fleet looks</p>
              <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800'>
                <div className='px-6 py-4 flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-medium text-gray-900 dark:text-white'>Dark mode</p>
                    <p className='text-xs text-gray-500 mt-0.5'>Switch between light and dark theme</p>
                  </div>
                  <button
                    onClick={toggleDarkMode}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      darkMode ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      darkMode ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}