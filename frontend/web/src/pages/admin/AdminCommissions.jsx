import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminCommissions() {
  const [garages, setGarages]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({ amount: '', period: '', note: '' })
  const [saving, setSaving]     = useState(false)

  useEffect(() => {
    api.get('/referrals/admin/all')
      .then(res => setGarages(res.data))
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSettle(e) {
    e.preventDefault()
    if (!selected) return
    setSaving(true)
    try {
      await api.post(`/referrals/admin/${selected.id}/settle`, form)
      setGarages(g => g.map(x =>
        x.id === selected.id
          ? { ...x, totalSettled: x.totalSettled + parseFloat(form.amount) }
          : x
      ))
      setSelected(null)
      setForm({ amount: '', period: '', note: '' })
    } catch (err) {
      console.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Garage Commissions</h1>
        <p className='text-sm text-gray-500 mt-1'>
          20% of each active customer device registered by garage partners
        </p>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <p className='text-sm text-gray-400 p-6'>Loading...</p>
        ) : garages.length === 0 ? (
          <p className='text-sm text-gray-400 p-6'>No garage owners registered yet</p>
        ) : (
          <div className='divide-y divide-gray-100'>
            {garages.map((g, i) => (
              <div key={i} className='px-5 py-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{g.name}</p>
                    <p className='text-xs text-gray-400'>{g.email}</p>
                    <div className='flex gap-4 mt-2'>
                      <span className='text-xs text-gray-500'>
                        {g.activeDevices} active device{g.activeDevices !== 1 ? 's' : ''}
                      </span>
                      <span className='text-xs font-medium text-teal-600'>
                        ${g.monthly}/mo commission
                      </span>
                      <span className='text-xs text-gray-400'>
                        ${g.totalSettled} total paid
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelected(g)
                      setForm({ amount: g.monthly.toString(), period: '', note: '' })
                    }}
                    className='h-8 px-3 text-xs font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition'
                  >
                    Record payout
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout modal */}
      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <h3 className='text-base font-semibold text-gray-800 mb-1'>
              Record payout — {selected.name}
            </h3>
            <p className='text-xs text-gray-400 mb-5'>
              Monthly commission: ${selected.monthly}
            </p>
            <form onSubmit={handleSettle} className='space-y-3'>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Amount ($)</label>
                <input
                  type='number'
                  step='0.01'
                  required
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className='w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Period (e.g. May–Jun 2026)</label>
                <input
                  type='text'
                  required
                  value={form.period}
                  onChange={e => setForm(f => ({ ...f, period: e.target.value }))}
                  className='w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500'
                />
              </div>
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Note (optional)</label>
                <input
                  type='text'
                  value={form.note}
                  onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                  className='w-full h-10 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500'
                />
              </div>
              <div className='flex gap-3 pt-2'>
                <button
                  type='submit'
                  disabled={saving}
                  className='flex-1 h-9 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
                >
                  {saving ? 'Saving...' : 'Confirm payout'}
                </button>
                <button
                  type='button'
                  onClick={() => setSelected(null)}
                  className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

