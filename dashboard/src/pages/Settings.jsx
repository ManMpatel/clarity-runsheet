import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import api from '../lib/api'

const TABS = ['Company', 'Users', 'Appearance']

export default function Settings() {
  const [tab, setTab]           = useState('Company')
  const [company, setCompany]   = useState(null)
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ name: '', phone: '', address: '' })
  const [showAddUser, setShowAddUser] = useState(false)
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'fleetManager'
  })

  const role        = useAuthStore(s => s.role)
  const { darkMode, toggleDarkMode } = useUiStore()

  useEffect(() => {
    async function load() {
      try {
        const [cRes, uRes] = await Promise.all([
          api.get('/api/settings/company'),
          api.get('/api/settings/users'),
        ])
        setCompany(cRes.data)
        setForm({ name: cRes.data.name || '', phone: cRes.data.phone || '', address: cRes.data.address || '' })
        setUsers(uRes.data)
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

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Settings</h1>
        <p className='text-sm text-gray-500 mt-1'>Manage your account and preferences</p>
      </div>

      <div className='flex gap-1 mb-6 border-b border-gray-200'>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
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
              <h2 className='text-sm font-semibold text-gray-700 mb-4'>Company details</h2>
              <div className='space-y-3'>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Company name</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
                <div>
                  <label className='block text-xs text-gray-500 mb-1'>Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                  />
                </div>
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

          {tab === 'Users' && (
            <div>
              <div className='flex items-center justify-between mb-4'>
                <h2 className='text-sm font-semibold text-gray-700'>Team members</h2>
                {['companyAdmin', 'superAdmin'].includes(role) && (
                  <button
                    onClick={() => setShowAddUser(true)}
                    className='h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition'
                  >
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
                  <p className='text-xs text-gray-400 mt-0.5'>Switch between light and dark theme</p>
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