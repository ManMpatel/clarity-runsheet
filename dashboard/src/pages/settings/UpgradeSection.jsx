import { useState } from 'react'
import api from '../../lib/api'
import Toast from '../../components/Toast'

const PLANS = [
  { id: 'entry', name: 'Entry', price: 18, slots: 'Up to 10 vans',
    features: ['Live GPS tracking', 'Basic trip history', 'Ignition alerts', 'After hours alerts'] },
  { id: 'mid', name: 'Mid', price: 25, slots: 'Up to 20 vans', popular: true,
    features: ['Everything in Entry', 'Driver behaviour scores', 'Geofence manager', 'FBT logbook', 'Maintenance scheduler'] },
  { id: 'top', name: 'Top', price: 45, slots: 'Up to 40 vans',
    features: ['Everything in Mid', 'Engine diagnostics', 'OBD fault codes', 'Advanced reports', 'Priority support'] },
]

export default function UpgradeSection() {
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState({ entrySlots: 0, midSlots: 0, topSlots: 0, message: '' })
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [toast, setToast]         = useState(null)

  const total = (form.entrySlots * 18) + (form.midSlots * 25) + (form.topSlots * 45)

  async function handleRequest() {
    if (!form.entrySlots && !form.midSlots && !form.topSlots) {
      setError('Please enter at least one slot quantity')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/upgrade/request', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed')
    } finally { setLoading(false) }
  }

  if (submitted) return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-6'>Upgrade Plan</h1>
      <div className='bg-green-50 border border-green-200 rounded-xl p-8 text-center'>
        <p className='text-3xl mb-3'>✓</p>
        <p className='text-green-700 font-semibold text-lg'>Request sent</p>
        <p className='text-green-600 text-sm mt-1'>We will contact you within 24 hours to confirm payment and activate your plan.</p>
      </div>
    </div>
  )

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Upgrade Plan</h1>
      <p className='text-sm text-gray-500 mb-6'>Choose a plan — we will contact you to arrange payment</p>

      <div className='grid grid-cols-3 gap-3 mb-6'>
        {PLANS.map(plan => (
          <div key={plan.id} onClick={() => setSelected(plan.id)}
            className={`relative bg-white dark:bg-gray-900 rounded-xl border-2 p-4 cursor-pointer transition ${
              selected === plan.id ? 'border-blue-500' :
              plan.popular ? 'border-blue-200' : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
            }`}>
            {plan.popular && (
              <span className='absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full'>
                Most Popular
              </span>
            )}
            <p className='text-base font-bold text-gray-900 dark:text-white mb-1'>{plan.name}</p>
            <p className='text-xl font-bold text-blue-600'>${plan.price}<span className='text-xs text-gray-400 font-normal'>/van/mo</span></p>
            <p className='text-xs text-gray-400 mb-3'>{plan.slots}</p>
            {plan.features.map((f, i) => (
              <p key={i} className='text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 mb-1'>
                <svg className='w-3 h-3 text-green-500 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={3} d='M5 13l4 4L19 7' />
                </svg>
                {f}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3'>
        <h3 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>Request slots</h3>
        {[
          { key: 'entrySlots', label: 'Entry slots', price: 18 },
          { key: 'midSlots',   label: 'Mid slots',   price: 25 },
          { key: 'topSlots',   label: 'Top slots',   price: 45 },
        ].map(f => (
          <div key={f.key} className='flex items-center gap-3'>
            <label className='text-sm text-gray-600 dark:text-gray-400 w-28'>{f.label}</label>
            <input type='number' min='0' value={form[f.key]}
              onChange={e => setForm(v => ({ ...v, [f.key]: parseInt(e.target.value) || 0 }))}
              className='w-20 h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500' />
            <span className='text-xs text-gray-400'>${f.price}/van/mo</span>
            {form[f.key] > 0 && (
              <span className='text-xs text-blue-600 font-medium'>= ${form[f.key] * f.price}/mo</span>
            )}
          </div>
        ))}

        {total > 0 && (
          <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg px-4 py-3 flex justify-between items-center'>
            <span className='text-sm text-blue-700 dark:text-blue-300 font-medium'>Monthly total</span>
            <span className='text-lg font-bold text-blue-700 dark:text-blue-300'>${total}/mo</span>
          </div>
        )}

        <textarea value={form.message} onChange={e => setForm(v => ({ ...v, message: e.target.value }))}
          placeholder='Tell us about your fleet (optional)...' rows={2}
          className='w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none resize-none' />
        {error && <p className='text-sm text-red-500'>{error}</p>}
        <button onClick={handleRequest} disabled={loading}
          className='w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition'>
          {loading ? 'Sending...' : 'Request upgrade'}
        </button>
        <p className='text-xs text-gray-400 text-center'>No automatic charges. We confirm payment manually.</p>
      </div>
    </div>
  )
}