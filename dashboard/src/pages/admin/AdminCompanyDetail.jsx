import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminCompanyDetail({ company, slots, onSaveSlots }) {
  const [tab, setTab]           = useState('overview')
  const [devices, setDevices]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [users, setUsers]       = useState([])
  const [loadingTab, setLoadingTab] = useState(false)
  const [editing, setEditing]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [slotForm, setSlotForm] = useState({
    entrySlots: slots?.slots?.entrySlots || 0,
    midSlots:   slots?.slots?.midSlots   || 0,
    topSlots:   slots?.slots?.topSlots   || 0,
  })
  const [accountType, setAccountType] = useState(company.accountType || 'contractor')

  const isGarage = company.accountType === 'garageOwner'

  const monthly =
    (slots?.slots?.entrySlots || 0) * 18 +
    (slots?.slots?.midSlots   || 0) * 25 +
    (slots?.slots?.topSlots   || 0) * 45

  const monthsActive = company.createdAt
    ? Math.max(1, Math.floor(
        (Date.now() - new Date(company.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
      ))
    : 1

  useEffect(() => {
    setTab('overview')
    setDevices([])
    setVehicles([])
    setUsers([])
    setEditing(false)
    setAccountType(company.accountType || 'contractor')
    setSlotForm({
      entrySlots: slots?.slots?.entrySlots || 0,
      midSlots:   slots?.slots?.midSlots   || 0,
      topSlots:   slots?.slots?.topSlots   || 0,
    })
  }, [company._id, slots])

  async function loadTab(t) {
    setTab(t)
    if (t === 'devices' && devices.length === 0) {
      setLoadingTab(true)
      try {
        const res = await api.get(`/api/admin/companies/${company._id}/devices`)
        setDevices(res.data)
      } catch (err) { console.error(err.message) }
      finally { setLoadingTab(false) }
    }
    if (t === 'vehicles' && vehicles.length === 0) {
      setLoadingTab(true)
      try {
        const res = await api.get(`/api/admin/companies/${company._id}/vehicles`)
        setVehicles(res.data)
      } catch (err) { console.error(err.message) }
      finally { setLoadingTab(false) }
    }
    if (t === 'users' && users.length === 0) {
      setLoadingTab(true)
      try {
        const res = await api.get(`/api/admin/companies/${company._id}/users`)
        setUsers(res.data)
      } catch (err) { console.error(err.message) }
      finally { setLoadingTab(false) }
    }
  }

  async function saveSlots() {
    setSaving(true)
    try {
      await onSaveSlots(company._id, slotForm)
      setEditing(false)
    } catch (err) { console.error(err.message) }
    finally { setSaving(false) }
  }

  async function saveAccountType(val) {
    setAccountType(val)
    try {
      await api.put(`/api/admin/companies/${company._id}/account-type`, { accountType: val })
    } catch (err) { console.error(err.message) }
  }

  async function handleRevoke() {
    if (!confirm('Revoke access for this company?')) return
    setRevoking(true)
    try {
      await api.put(`/api/admin/companies/${company._id}/revoke`)
    } catch (err) { console.error(err.message) }
    finally { setRevoking(false) }
  }

  const tabs = ['overview', isGarage ? 'devices' : 'vehicles', 'users', 'details']

  return (
    <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>

      {/* Header */}
      <div className='px-5 py-4 border-b border-gray-200'>
        <div className='flex items-start justify-between'>
          <div>
            <p className='text-base font-semibold text-gray-900'>{company.name}</p>
            <p className='text-xs text-gray-400 mt-0.5'>{company.email || 'No email'}</p>
            {company.phone && <p className='text-xs text-gray-400'>{company.phone}</p>}
          </div>
          <div className='flex items-center gap-2'>
            <select
              value={accountType}
              onChange={e => saveAccountType(e.target.value)}
              className='h-8 px-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
            >
              <option value='contractor'>Contractor</option>
              <option value='garageOwner'>Garage Owner</option>
              <option value='individual'>Individual</option>
            </select>
            <button
              onClick={handleRevoke}
              disabled={revoking}
              className='h-8 px-3 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition disabled:opacity-50'
            >
              Revoke
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className='flex border-b border-gray-200 px-5'>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => loadTab(t)}
            className={`mr-4 py-2.5 text-xs font-medium capitalize border-b-2 transition-colors ${
              tab === t
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className='p-5'>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div className='space-y-5'>

            {/* Revenue */}
            <div className='grid grid-cols-3 gap-3'>
              <div className='bg-gray-50 rounded-lg p-3'>
                <p className='text-xs text-gray-500'>Monthly revenue</p>
                <p className='text-lg font-bold text-gray-900 mt-0.5'>${monthly}</p>
              </div>
              <div className='bg-gray-50 rounded-lg p-3'>
                <p className='text-xs text-gray-500'>Months active</p>
                <p className='text-lg font-bold text-gray-900 mt-0.5'>{monthsActive}</p>
              </div>
              <div className='bg-gray-50 rounded-lg p-3'>
                <p className='text-xs text-gray-500'>Est. total revenue</p>
                <p className='text-lg font-bold text-gray-900 mt-0.5'>${monthly * monthsActive}</p>
              </div>
            </div>

            {/* Slot bars */}
            <div className='space-y-2'>
              {[
                { label: 'Entry ($18)', key: 'entrySlots', used: slots?.used?.entry || 0, color: 'bg-blue-500' },
                { label: 'Mid ($25)',   key: 'midSlots',   used: slots?.used?.mid   || 0, color: 'bg-teal-500' },
                { label: 'Top ($45)',   key: 'topSlots',   used: slots?.used?.top   || 0, color: 'bg-purple-500' },
              ].map(({ label, key, used, color }) => {
                const total = slots?.slots?.[key] || 0
                const pct   = total > 0 ? Math.min((used / total) * 100, 100) : 0
                return (
                  <div key={key}>
                    <div className='flex justify-between text-xs text-gray-500 mb-1'>
                      <span>{label}</span>
                      <span>{used} / {total}</span>
                    </div>
                    <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Edit slots */}
            {editing ? (
              <div className='space-y-3 pt-2'>
                {['entrySlots', 'midSlots', 'topSlots'].map(key => (
                  <div key={key} className='flex items-center justify-between'>
                    <span className='text-xs text-gray-600 capitalize'>{key.replace('Slots', '')} slots</span>
                    <input
                      type='number'
                      min='0'
                      value={slotForm[key]}
                      onChange={e => setSlotForm(f => ({ ...f, [key]: parseInt(e.target.value) || 0 }))}
                      className='w-20 h-8 px-2 text-xs border border-gray-300 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-purple-500'
                    />
                  </div>
                ))}
                <div className='flex gap-2 pt-1'>
                  <button onClick={saveSlots} disabled={saving}
                    className='flex-1 h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-lg transition disabled:opacity-50'>
                    {saving ? 'Saving...' : 'Save slots'}
                  </button>
                  <button onClick={() => setEditing(false)}
                    className='flex-1 h-8 border border-gray-300 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition'>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setEditing(true)}
                className='h-8 px-4 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition'>
                Edit slots
              </button>
            )}

            {/* Member since */}
            {company.createdAt && (
              <p className='text-xs text-gray-400'>
                Member since {new Date(company.createdAt).toLocaleDateString('en-AU')}
              </p>
            )}
          </div>
        )}

        {/* Devices Tab (garage owners) */}
        {tab === 'devices' && (
          <div>
            {loadingTab ? (
              <p className='text-sm text-gray-400'>Loading...</p>
            ) : devices.length === 0 ? (
              <p className='text-sm text-gray-400'>No devices registered</p>
            ) : (
              <div className='space-y-2'>
                {devices.map((d, i) => (
                  <div key={i} className='flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{d.imei}</p>
                      <p className='text-xs text-gray-400'>{d.deviceType || 'FMC920'}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {d.status || 'registered'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vehicles Tab (contractors) */}
        {tab === 'vehicles' && (
          <div>
            {loadingTab ? (
              <p className='text-sm text-gray-400'>Loading...</p>
            ) : vehicles.length === 0 ? (
              <p className='text-sm text-gray-400'>No vehicles registered</p>
            ) : (
              <div className='space-y-2'>
                {vehicles.map((v, i) => (
                  <div key={i} className='flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{v.name || v.rego}</p>
                      <p className='text-xs text-gray-400'>{v.rego}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                      v.tier === 'mid' ? 'bg-teal-100 text-teal-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {v.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            {loadingTab ? (
              <p className='text-sm text-gray-400'>Loading...</p>
            ) : users.length === 0 ? (
              <p className='text-sm text-gray-400'>No users found</p>
            ) : (
              <div className='space-y-2'>
                {users.map((u, i) => (
                  <div key={i} className='flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-lg'>
                    <div className='w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0'>
                      {(u.name || u.email || '?')[0].toUpperCase()}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <p className='text-sm font-medium text-gray-800 truncate'>{u.name || 'No name'}</p>
                      <p className='text-xs text-gray-400 truncate'>{u.email}</p>
                      {u.phone && <p className='text-xs text-gray-400'>{u.phone}</p>}
                      {u.address && <p className='text-xs text-gray-400 truncate'>{u.address}</p>}
                      {u.createdAt && (
                        <p className='text-xs text-gray-300 mt-0.5'>
                          Joined {new Date(u.createdAt).toLocaleDateString('en-AU')}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      u.role === 'companyAdmin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {tab === 'details' && (
          <div className='space-y-3'>
            {[
              { label: 'Email',   value: company.email,   icon: '📧' },
              { label: 'Phone',    value: company.phone },
              { label: 'Address',  value: company.address },
              { label: 'Website',  value: company.website },
              { label: 'ABN',      value: company.abn },
              { label: 'Timezone', value: company.timezone },
            ].map((row, i) => (
              <div key={i} className='flex items-start gap-3 px-3 py-2.5 bg-gray-50 rounded-lg'>
              <span className='text-sm mt-0.5'>{row.icon}</span>
              <div>
                <p className='text-xs text-gray-400'>{row.label}</p>
                <p className='text-sm font-medium text-gray-800'>
                  {row.value || <span className='text-gray-300 font-normal'>Not set</span>}
                </p>
              </div>
            </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

