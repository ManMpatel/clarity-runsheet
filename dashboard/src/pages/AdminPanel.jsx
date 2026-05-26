import { useEffect, useState } from 'react'
import api from '../lib/api'
import AdminCompanyDetail from './admin/AdminCompanyDetail'

export default function AdminPanel() {
  const [companies, setCompanies] = useState([])
  const [requests, setRequests]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [slots, setSlots]         = useState(null)
  const [loading, setLoading]     = useState(true)

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

  async function handleRevoke(companyId) {
  if (!confirm('Revoke access for this company?')) return
  try {
    await api.post(`/api/admin/companies/${companyId}/revoke`)
    setCompanies(cs => cs.map(c => c._id === companyId ? { ...c, active: false } : c))
  } catch (err) {
    alert('Failed to revoke')
  }
}

async function handleDelete(companyId) {
  if (!confirm('Permanently delete this company and all their data? This cannot be undone.')) return
  try {
    await api.delete(`/api/admin/companies/${companyId}`)
    setCompanies(cs => cs.filter(c => c._id !== companyId))
    setSelected(null)
  } catch (err) {
    alert('Failed to delete')
  }
}

  async function selectCompany(company) {
    setSelected(company)
    setSlots(null)
    try {
      const res = await api.get(`/api/admin/companies/${company._id}/slots`)
      setSlots(res.data)
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleSaveSlots(companyId, slotForm) {
    await api.put(`/api/admin/companies/${companyId}/slots`, slotForm)
    const res = await api.get(`/api/admin/companies/${companyId}/slots`)
    setSlots(res.data)
  }

  async function actionRequest(id, action) {
    try {
      await api.put(`/api/admin/upgrade-requests/${id}/action`, { action })
      setRequests(r => r.map(req => req._id === id ? { ...req, status: action } : req))
    } catch (err) {
      console.error(err.message)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-900 mb-1'>Super Admin Panel</h1>
      <p className='text-sm text-gray-500 mb-6'>Manage all client companies and slot allocations</p>

      {pending.length > 0 && (
        <div className='bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6'>
          <h2 className='text-sm font-semibold text-amber-800 mb-3'>
            Pending upgrade requests ({pending.length})
          </h2>
          <div className='space-y-3'>
            {pending.map((req, i) => (
              <div key={i} className='bg-white rounded-lg border border-amber-200 p-4'>
                <div className='flex items-start justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{req.companyName}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>
                      Entry: {req.entrySlots} Mid: {req.midSlots} Top: {req.topSlots}
                    </p>
                    {req.message && <p className='text-xs text-gray-600 mt-1'>"{req.message}"</p>}
                    <p className='text-xs text-gray-400 mt-1'>
                      {new Date(req.createdAt).toLocaleDateString('en-AU')}
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <button
                      onClick={() => actionRequest(req._id, 'approved')}
                      className='h-7 px-3 bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium rounded-lg'
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => actionRequest(req._id, 'rejected')}
                      className='h-7 px-3 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg'
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
            ) : companies.length === 0 ? (
              <p className='text-sm text-gray-400 p-4'>No companies yet</p>
            ) : companies.map((c, i) => (
              <button
                key={i}
                onClick={() => selectCompany(c)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                  selected?._id === c._id ? 'bg-purple-50 border-l-2 border-purple-500' : ''
                }`}
              >
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{c.name}</p>
                    <p className='text-xs text-gray-400'>{c.email}</p>
                  </div>
                  <div className='flex gap-1.5'>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      c.subscriptionTier === 'locked'
                        ? 'bg-gray-100 text-gray-500'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {c.subscriptionTier || 'locked'}
                    </span>
                    {c.accountType === 'garageOwner' && (
                      <span className='text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700'>
                        Garage
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex gap-2 mt-2'>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRevoke(c._id) }}
                  className='text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition'>
                  Revoke
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c._id) }}
                  className='text-xs px-2 py-1 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition'>
                  Delete
                </button>
              </div>
              </button>
              
            ))}
          </div>
        </div>

        <div>
          {selected && slots ? (
            <AdminCompanyDetail
              company={selected}
              slots={slots}
              onSaveSlots={handleSaveSlots}
            />
          ) : selected && !slots ? (
            <div className='bg-white rounded-xl border border-gray-200 p-6'>
              <p className='text-sm text-gray-400'>Loading company data...</p>
            </div>
          ) : (
            <div className='bg-white rounded-xl border border-gray-200 p-6 text-center'>
              <p className='text-sm text-gray-400'>Select a company to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}