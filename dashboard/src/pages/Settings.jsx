import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import api from '../lib/api'

const TABS = ['Company', 'Vehicles', 'Users', 'Appearance']

export default function Settings() {
  const [tab, setTab]         = useState('Company')
  const [company, setCompany] = useState(null)
  const [users, setUsers]     = useState([])
  const [vehicles, setVehicles] = useState([])
  const [slots, setSlots]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [showAddVan, setShowAddVan] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [form, setForm]       = useState({ name: '', phone: '', address: '' })
  const [vanForm, setVanForm] = useState({
    name: '', imei: '', registration: '', make: '', model: '', year: ''
  })
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'fleetManager'
  })

  const role = useAuthStore(s => s.role)
  const companyId = useAuthStore(s => s.companyId)
  const { darkMode, toggleDarkMode } = useUiStore()

  useEffect(() => {
    async function load() {
      try {
        const [cRes, uRes, vRes] = await Promise.all([
          api.get('/api/settings/company'),
          api.get('/api/settings/users'),
          api.get('/api/vehicles'),
        ])
        setCompany(cRes.data)
        setForm({
          name:    cRes.data.name    || '',
          phone:   cRes.data.phone   || '',
          address: cRes.data.address || '',
        })
        setUsers(uRes.data)
        setVehicles(vRes.data)

        const sRes = await api.get(`/api/admin/companies/${cRes.data._id}/slots`)
          .catch(() => null)
        if (sRes) setSlots(sRes.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSaveCompany() {
    setSaving(true)
    try {
      const res = await api.put('/api/settings/company', form)
      setCompany(res.data)
    } catch (err) {
      console.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleAddVan() {
    try {
      const res = await api.post('/api/vehicles', vanForm)
      setVehicles(v => [...v, res.data])
      setShowAddVan(false)
      setVanForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleTierChange(vehicleId, tier) {
    try {
      const res = await api.put(`/api/vehicles/${vehicleId}/tier`, { tier })
      setVehicles(v => v.map(van => van._id === vehicleId ? res.data : van))
    } catch (err) {
      alert(err.response?.data?.error || 'Tier change failed')
    }
  }

  async function handleAddUser() {
    try {
      const res = await api.post('/api/settings/users', userForm)
      setUsers(u => [...u, res.data])
      setShowAddUser(false)
      setUserForm({ name: '', email: '', password: '', role: 'fleetManager' })
    } catch (err) {
      console.error(err.message)
    }
  }

  const entryUsed  = vehicles.filter(v => v.tier === 'entry' || !v.tier).length
  const midUsed    = vehicles.filter(v => v.tier === 'mid').length
  const topUsed    = vehicles.filter(v => v.tier === 'top').length
  const entryTotal = slots?.slots?.entrySlots || 0
  const midTotal   = slots?.slots?.midSlots   || 0
  const topTotal   = slots?.slots?.topSlots   || 0

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Settings</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Manage your account and fleet
        </p>
      </div>

      <div className='flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto'>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${
              tab === t
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading...</p>
      ) : (
        <>
          {tab === 'Company' && (
            <div className='bg-white rounded-xl border border-gray-200 p-6 max-w-lg'>
              <h2 className='text-sm font-semibold text-gray-700 mb-4'>
                Company details
              </h2>
              <div className='space-y-3'>
                <Field label='Company name'>
                  <input value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                </Field>
                <Field label='Phone'>
                  <input value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                </Field>
                <Field label='Address'>
                  <input value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                </Field>
              </div>
              <button
                onClick={handleSaveCompany}
                disabled={saving}
                className='mt-5 h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          )}

          {tab === 'Vehicles' && (
            <div>
              <div className='grid grid-cols-3 gap-4 mb-6'>
                <SlotBar label='Entry' used={entryUsed} total={entryTotal} color='blue' />
                <SlotBar label='Mid'   used={midUsed}   total={midTotal}   color='teal' />
                <SlotBar label='Top'   used={topUsed}   total={topTotal}   color='purple' />
              </div>

              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-sm font-semibold text-gray-700'>
                  Registered vans ({vehicles.length})
                </h2>
                <button
                  onClick={() => setShowAddVan(true)}
                  className='h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition'
                >
                  + Register van
                </button>
              </div>

              <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-200 bg-gray-50'>
                      <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Van</th>
                      <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>IMEI</th>
                      <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Rego</th>
                      <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Tier</th>
                      <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase'>Changes left</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-gray-100'>
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={5} className='px-4 py-8 text-center text-sm text-gray-400'>
                          No vans registered yet
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((van, i) => (
                        <tr key={i} className='hover:bg-gray-50'>
                          <td className='px-4 py-3 font-medium text-gray-800'>{van.name}</td>
                          <td className='px-4 py-3 text-gray-500 font-mono text-xs'>{van.imei}</td>
                          <td className='px-4 py-3 text-gray-500'>{van.registration || '--'}</td>
                          <td className='px-4 py-3'>
                            {van.tierChangesRemaining > 0 ? (
                              <select
                                value={van.tier || 'entry'}
                                onChange={e => handleTierChange(van._id, e.target.value)}
                                className='h-8 px-2 rounded-lg border border-gray-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500'
                              >
                                <option value='entry'>Entry</option>
                                <option value='mid'>Mid</option>
                                <option value='top'>Top</option>
                              </select>
                            ) : (
                              <span className='text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full'>
                                {van.tier || 'entry'} 🔒
                              </span>
                            )}
                          </td>
                          <td className='px-4 py-3'>
                            <span className={`text-xs font-medium ${
                              van.tierChangesRemaining > 1
                                ? 'text-teal-600'
                                : van.tierChangesRemaining === 1
                                ? 'text-amber-600'
                                : 'text-red-500'
                            }`}>
                              {van.tierChangesRemaining ?? 3} remaining
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {showAddVan && (
                <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
                  <div className='bg-white rounded-xl w-full max-w-md p-6'>
                    <div className='flex items-center justify-between mb-5'>
                      <h3 className='text-base font-semibold text-gray-800'>
                        Register new van
                      </h3>
                      <button onClick={() => setShowAddVan(false)}
                        className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
                    </div>
                    <div className='space-y-3'>
                      <input placeholder='Van name (e.g. Van 01)'
                        value={vanForm.name}
                        onChange={e => setVanForm(f => ({ ...f, name: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <input placeholder='IMEI number (from device label)'
                        value={vanForm.imei}
                        onChange={e => setVanForm(f => ({ ...f, imei: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <input placeholder='Registration plate'
                        value={vanForm.registration}
                        onChange={e => setVanForm(f => ({ ...f, registration: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <div className='grid grid-cols-2 gap-3'>
                        <input placeholder='Make (e.g. Mercedes)'
                          value={vanForm.make}
                          onChange={e => setVanForm(f => ({ ...f, make: e.target.value }))}
                          className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                        <input placeholder='Model (e.g. Sprinter)'
                          value={vanForm.model}
                          onChange={e => setVanForm(f => ({ ...f, model: e.target.value }))}
                          className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      </div>
                      <input placeholder='Year'
                        value={vanForm.year}
                        onChange={e => setVanForm(f => ({ ...f, year: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                    </div>
                    <div className='flex gap-3 mt-5'>
                      <button onClick={handleAddVan}
                        className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'>
                        Register van
                      </button>
                      <button onClick={() => setShowAddVan(false)}
                        className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'Users' && (
            <div>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-sm font-semibold text-gray-700'>Team members</h2>
                {['companyAdmin', 'superAdmin'].includes(role) && (
                  <button onClick={() => setShowAddUser(true)}
                    className='h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition'>
                    + Add user
                  </button>
                )}
              </div>
              <div className='bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden max-w-2xl'>
                {users.map((user, i) => (
                  <div key={i} className='flex items-center justify-between px-4 py-3'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{user.name}</p>
                      <p className='text-xs text-gray-400'>{user.email}</p>
                    </div>
                    <span className='text-xs font-medium px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full'>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>

              {showAddUser && (
                <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
                  <div className='bg-white rounded-xl w-full max-w-md p-6'>
                    <div className='flex items-center justify-between mb-5'>
                      <h3 className='text-base font-semibold text-gray-800'>Add team member</h3>
                      <button onClick={() => setShowAddUser(false)}
                        className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
                    </div>
                    <div className='space-y-3'>
                      <input placeholder='Full name' value={userForm.name}
                        onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <input placeholder='Email' type='email' value={userForm.email}
                        onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <input placeholder='Password' type='password' value={userForm.password}
                        onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                      <select value={userForm.role}
                        onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                        className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'>
                        <option value='fleetManager'>Fleet Manager</option>
                        <option value='companyAdmin'>Company Admin</option>
                      </select>
                    </div>
                    <div className='flex gap-3 mt-5'>
                      <button onClick={handleAddUser}
                        className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'>
                        Add user
                      </button>
                      <button onClick={() => setShowAddUser(false)}
                        className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'>
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'Appearance' && (
            <div className='bg-white rounded-xl border border-gray-200 p-6 max-w-md'>
              <h2 className='text-sm font-semibold text-gray-700 mb-4'>Appearance</h2>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-800'>Dark mode</p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    Switch between light and dark theme
                  </p>
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
          )}
        </>
      )}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className='block text-xs text-gray-500 mb-1'>{label}</label>
      {children}
    </div>
  )
}

function SlotBar({ label, used, total, color }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const colors = {
    blue:   'bg-blue-500',
    teal:   'bg-teal-500',
    purple: 'bg-purple-500',
  }
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <div className='flex justify-between text-xs text-gray-500 mb-2'>
        <span className='font-medium text-gray-700'>{label}</span>
        <span>{used} / {total} used</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div
          className={`h-full rounded-full transition-all ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {total === 0 && (
        <p className='text-xs text-gray-400 mt-1'>No slots allocated</p>
      )}
    </div>
  )
}