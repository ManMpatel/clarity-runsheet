import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function AdminPanel() {
  const [companies, setCompanies]   = useState([])
  const [requests, setRequests]     = useState([])
  const [selected, setSelected]     = useState(null)
  const [slots, setSlots]           = useState(null)
  const [slotForm, setSlotForm]     = useState({ entrySlots: 0, midSlots: 0, topSlots: 0 })
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cRes, rRes] = await Promise.all([
          api.get('/api/admin/companies'),
          api.get('/api/admin/upgrade-requests'),
        ])
        setCompanies(cRes.data)
        setRequests(rRes.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function selectCompany(company) {
    setSelected(company)
    try {
      const res = await api.get(`/api/admin/companies/${company._id}/slots`)
      setSlots(res.data)
      setSlotForm({
        entrySlots: res.data.slots.entrySlots || 0,
        midSlots:   res.data.slots.midSlots   || 0,
        topSlots:   res.data.slots.topSlots   || 0,
      })
    } catch (err) {
      console.error(err.message)
    }
  }

  async function saveSlots() {
    setSaving(true)
    try {
      await api.put(`/api/admin/companies/${selected._id}/slots`, slotForm)
      const res = await api.get(`/api/admin/companies/${selected._id}/slots`)
      setSlots(res.data)
    } catch (err) {
      console.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function actionRequest(id, action) {
    try {
      await api.put(`/api/admin/upgrade-requests/${id}/action`, { action })
      setRequests(r => r.map(req =>
        req._id === id ? { ...req, status: action } : req
      ))
    } catch (err) {
      console.error(err.message)
    }
  }

  async function setRole(companyId, role) {
  try {
    await api.put(`/api/admin/companies/${companyId}/set-role`, { role })
    setCompanies(prev =>
      prev.map(c => c._id === companyId ? { ...c, role } : c)
    )
  } catch (err) {
    console.error(err.message)
  }
}

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Super Admin Panel</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Manage all client companies and slot allocations
        </p>
      </div>

      {requests.filter(r => r.status === 'pending').length > 0 && (
        <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6'>
          <h2 className='text-sm font-semibold text-amber-800 mb-3'>
            Pending upgrade requests ({requests.filter(r => r.status === 'pending').length})
          </h2>
          <div className='space-y-3'>
            {requests.filter(r => r.status === 'pending').map((req, i) => (
              <div key={i} className='bg-white rounded-lg border border-amber-200 p-4'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{req.companyName}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      Requesting — Entry: {req.entrySlots} Mid: {req.midSlots} Top: {req.topSlots}
                    </p>
                    {req.message && (
                      <p className='text-xs text-gray-600 mt-1'>"{req.message}"</p>
                    )}
                    <p className='text-xs text-gray-400 mt-1'>
                      {new Date(req.createdAt).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => actionRequest(req._id, 'approved')}
                      className='h-7 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg transition'
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actionRequest(req._id, 'rejected')}
                      className='h-7 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition'
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          <div className='px-4 py-3 border-b border-gray-200'>
            <h2 className='text-sm font-semibold text-gray-700'>
              All companies ({companies.length})
            </h2>
          </div>
          <div className='divide-y divide-gray-100'>
            {loading ? (
              <p className='text-sm text-gray-400 p-4'>Loading...</p>
            ) : companies.map((company, i) => (
              <button
                key={i}
                onClick={() => selectCompany(company)}
                className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                  selected?._id === company._id
                    ? 'bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className='text-sm font-medium text-gray-800'>{company.name}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>{company.slug}</p>
                </div>
                <div className='flex items-center gap-2'>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    company.subscriptionTier === 'locked'
                      ? 'bg-gray-100 text-gray-600'
                      : company.subscriptionTier === 'top'
                      ? 'bg-purple-100 text-purple-700'
                      : company.subscriptionTier === 'mid'
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {company.subscriptionTier}
                  </span>
                  {company.role === 'garageOwner' ? (
                    <span className='text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700'>
                      Garage
                    </span>
                  ) : (
                    <button
                      onClick={e => { e.stopPropagation(); setRole(company._id, 'garageOwner') }}
                      className='text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-700 transition'
                    >
                      + Garage
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {selected && slots && (
          <div className='bg-white rounded-xl border border-gray-200 p-5'>
            <h2 className='text-sm font-semibold text-gray-700 mb-4'>
              {selected.name} — Slot Management
            </h2>

            <div className='space-y-3 mb-5'>
              <SlotBar
                label='Entry slots'
                used={slots.used.entry}
                total={slotForm.entrySlots}
                color='blue'
              />
              <SlotBar
                label='Mid slots'
                used={slots.used.mid}
                total={slotForm.midSlots}
                color='teal'
              />
              <SlotBar
                label='Top slots'
                used={slots.used.top}
                total={slotForm.topSlots}
                color='purple'
              />
            </div>

            <h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3'>
              Assign slots
            </h3>

            <div className='space-y-3 mb-5'>
              <SlotInput
                label='Entry slots'
                value={slotForm.entrySlots}
                onChange={v => setSlotForm(f => ({ ...f, entrySlots: v }))}
                price={18}
              />
              <SlotInput
                label='Mid slots'
                value={slotForm.midSlots}
                onChange={v => setSlotForm(f => ({ ...f, midSlots: v }))}
                price={25}
              />
              <SlotInput
                label='Top slots'
                value={slotForm.topSlots}
                onChange={v => setSlotForm(f => ({ ...f, topSlots: v }))}
                price={45}
              />
            </div>

            <div className='bg-gray-50 rounded-lg p-3 mb-4'>
              <p className='text-xs text-gray-500'>Monthly revenue from this client</p>
              <p className='text-lg font-bold text-gray-800 mt-0.5'>
                ${(
                  slotForm.entrySlots * 18 +
                  slotForm.midSlots   * 25 +
                  slotForm.topSlots   * 45
                ).toLocaleString()}/month
              </p>
            </div>

            <button
              onClick={saveSlots}
              disabled={saving}
              className='w-full h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
            >
              {saving ? 'Saving...' : 'Save slot allocation'}
            </button>
          </div>
        )}

      </div>

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
    <div>
      <div className='flex justify-between text-xs text-gray-500 mb-1'>
        <span>{label}</span>
        <span>{used} / {total} used</span>
      </div>
      <div className='h-2 bg-gray-100 rounded-full overflow-hidden'>
        <div
          className={`h-full rounded-full transition-all ${colors[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function SlotInput({ label, value, onChange, price }) {
  return (
    <div className='flex items-center gap-3'>
      <label className='text-sm text-gray-600 w-28'>{label}</label>
      <input
        type='number'
        min='0'
        value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className='w-20 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
      />
      <span className='text-xs text-gray-400'>${price}/van/mo</span>
    </div>
  )
}