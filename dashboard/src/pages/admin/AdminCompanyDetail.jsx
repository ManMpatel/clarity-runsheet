import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminCompanyDetail({ company, slots, onSaveSlots }) {
  const [tab, setTab]         = useState('overview')
  const [devices, setDevices] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loadingTab, setLoadingTab] = useState(false)
  const [editing, setEditing] = useState(false)
  const [slotForm, setSlotForm] = useState({
    entrySlots: slots?.slots?.entrySlots || 0,
    midSlots:   slots?.slots?.midSlots   || 0,
    topSlots:   slots?.slots?.topSlots   || 0,
  })
  const [saving, setSaving] = useState(false)

  const isGarage = company.accountType === 'garageOwner'

  useEffect(() => {
    setTab('overview')
    setDevices([])
    setVehicles([])
    setEditing(false)
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
  }

  async function saveSlots() {
    setSaving(true)
    try {
      await onSaveSlots(company._id, slotForm)
      setEditing(false)
    } catch (err) { console.error(err.message) }
    finally { setSaving(false) }
  }

  const tabs = isGarage
    ? ['overview', 'devices']
    : ['overview', 'vehicles']

  const entryUsed = slots?.used?.entry || 0
  const midUsed   = slots?.used?.mid   || 0
  const topUsed   = slots?.used?.top   || 0
  const entryTotal = slots?.slots?.entrySlots || 0
  const midTotal   = slots?.slots?.midSlots   || 0
  const topTotal   = slots?.slots?.topSlots   || 0
  const monthly = (entryTotal * 18) + (midTotal * 25) + (topTotal * 45)
  const commission = isGarage ? (monthly * 0.1).toFixed(2) : null

  return (
    <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>

      <div className='px-6 py-4 border-b border-gray-200'>
        <div className='flex items-start justify-between'>
          <div>
            <h2 className='text-base font-bold text-gray-900'>{company.name}</h2>
            <p className='text-xs text-gray-500 mt-0.5'>{company.email}</p>
            {company.phone && <p className='text-xs text-gray-500'>{company.phone}</p>}
          </div>
          <div className='flex flex-col items-end gap-1'>
            <select
              value={company.accountType || 'contractor'}
              onChange={async (e) => {
                const accountType = e.target.value
                try {
                  await api.put(`/api/admin/companies/${company._id}/account-type`, { accountType })
                  window.location.reload()
                } catch (err) {
                  alert('Failed to update account type')
                }
              }}
              className='text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-300 cursor-pointer'
            >
              <option value='contractor'>Contractor</option>
              <option value='garage_owner'>Garage Owner</option>
              <option value='individual'>Individual</option>
            </select>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              company.subscriptionTier === 'locked'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-green-100 text-green-700'
            }`}>
              {company.subscriptionTier || 'locked'}
            </span>
          </div>
        </div>
        <p className='text-xs text-gray-400 mt-2'>
          Joined {new Date(company.createdAt).toLocaleDateString('en-AU')}
        </p>
      </div>

      <div className='flex border-b border-gray-200'>
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => loadTab(t)}
            className={`px-5 py-2.5 text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-purple-500 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className='p-6'>

        {tab === 'overview' && (
          <div className='space-y-6'>
            <div>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>Slot Usage</h3>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className='text-xs text-purple-600 hover:text-purple-700 font-medium'
                  >
                    Edit slots
                  </button>
                )}
              </div>

              <div className='space-y-3'>
                {[
                  { label: 'Entry', used: entryUsed, total: entryTotal, price: '$18' },
                  { label: 'Mid',   used: midUsed,   total: midTotal,   price: '$25' },
                  { label: 'Top',   used: topUsed,   total: topTotal,   price: '$45' },
                ].map(s => (
                  <div key={s.label}>
                    <div className='flex justify-between text-xs text-gray-600 mb-1'>
                      <span>{s.label} — {s.price}/van</span>
                      <span>{s.used} / {s.total} used</span>
                    </div>
                    <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                      <div
                        className='h-full bg-purple-500 rounded-full'
                        style={{ width: s.total > 0 ? `${(s.used / s.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editing && (
              <div className='border border-gray-200 rounded-lg p-4 space-y-3'>
                <h3 className='text-xs font-semibold text-gray-700 uppercase tracking-wide'>Assign Slots</h3>
                {[
                  { key: 'entrySlots', label: 'Entry slots', price: '$18/van' },
                  { key: 'midSlots',   label: 'Mid slots',   price: '$25/van' },
                  { key: 'topSlots',   label: 'Top slots',   price: '$45/van' },
                ].map(f => (
                  <div key={f.key} className='flex items-center justify-between'>
                    <span className='text-sm text-gray-600'>{f.label}</span>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs text-gray-400'>{f.price}</span>
                      <input
                        type='number'
                        min={0}
                        value={slotForm[f.key]}
                        onChange={e => setSlotForm(s => ({ ...s, [f.key]: parseInt(e.target.value) || 0 }))}
                        className='w-16 text-center border border-gray-300 rounded-lg px-2 py-1 text-sm'
                      />
                    </div>
                  </div>
                ))}
                <div className='flex gap-2 pt-1'>
                  <button
                    onClick={saveSlots}
                    disabled={saving}
                    className='flex-1 h-8 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition'
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className='flex-1 h-8 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition'
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className='border-t border-gray-100 pt-4 space-y-2'>
              <div className='flex justify-between text-sm'>
                <span className='text-gray-500'>Monthly revenue</span>
                <span className='font-semibold text-gray-900'>${monthly}/mo</span>
              </div>
              {isGarage && (
                <div className='flex justify-between text-sm'>
                  <span className='text-gray-500'>Commission (10%)</span>
                  <span className='font-semibold text-orange-600'>${commission}/mo</span>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'devices' && (
          <div>
            <p className='text-xs text-gray-500 mb-4'>{devices.length} devices registered</p>
            {loadingTab ? (
              <p className='text-sm text-gray-400'>Loading...</p>
            ) : devices.length === 0 ? (
              <p className='text-sm text-gray-400'>No devices registered yet</p>
            ) : (
              <div className='space-y-3'>
                {devices.map((d, i) => (
                  <div key={i} className='border border-gray-200 rounded-lg p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <span className='font-mono text-xs text-gray-800'>{d.imei}</span>
                      <div className='flex gap-1.5'>
                        <span className='text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded'>{d.deviceType}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          d.subscriptionStatus === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {d.subscriptionStatus}
                        </span>
                      </div>
                    </div>
                    {d.customerId ? (
                      <div className='text-xs text-gray-500 space-y-0.5'>
                        <p className='font-medium text-gray-700'>Customer linked</p>
                        <p>{d.customerId}</p>
                      </div>
                    ) : (
                      <p className='text-xs text-gray-400'>No customer linked yet</p>
                    )}
                    <p className='text-xs text-gray-400 mt-1'>
                      Registered {new Date(d.registeredAt).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'vehicles' && (
          <div>
            <p className='text-xs text-gray-500 mb-4'>{vehicles.length} active vehicles</p>
            {loadingTab ? (
              <p className='text-sm text-gray-400'>Loading...</p>
            ) : vehicles.length === 0 ? (
              <p className='text-sm text-gray-400'>No vehicles registered yet</p>
            ) : (
              <div className='space-y-2'>
                {vehicles.map((v, i) => (
                  <div key={i} className='flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5'>
                    <div>
                      <p className='text-sm font-medium text-gray-800'>{v.name}</p>
                      {v.registration && <p className='text-xs text-gray-400'>{v.registration}</p>}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                      v.tier === 'mid' ? 'bg-blue-100 text-blue-700'    :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {v.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}