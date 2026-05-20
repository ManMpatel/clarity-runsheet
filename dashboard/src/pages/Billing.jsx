import { useState } from 'react'
import api from '../lib/api'

const PLANS = [
  {
    id:    'entry',
    name:  'Entry',
    price: 18,
    per:   'van/month',
    slots: 'Up to 10 vans',
    color: 'blue',
    features: [
      'Live GPS tracking',
      'Basic trip history',
      'Ignition on/off alerts',
      'After hours alerts',
      'Basic dashboard',
    ],
    locked: [
      'Driver behaviour scores',
      'Geofence manager',
      'Engine diagnostics',
      'FBT logbook',
      'Advanced reports',
    ]
  },
  {
    id:    'mid',
    name:  'Mid',
    price: 25,
    per:   'van/month',
    slots: 'Up to 20 vans',
    color: 'teal',
    features: [
      'Everything in Entry',
      'Driver behaviour scores',
      'Safety leaderboard',
      'Geofence manager',
      'Trip classification',
      'FBT logbook',
      'Maintenance scheduler',
      'SMS alerts',
    ],
    locked: [
      'Engine diagnostics',
      'OBD fault codes',
      'Advanced analytics',
    ]
  },
  {
    id:    'top',
    name:  'Top',
    price: 45,
    per:   'van/month',
    slots: 'Up to 40 vans',
    color: 'purple',
    features: [
      'Everything in Mid',
      'Full engine diagnostics',
      'OBD fault codes',
      'Advanced reports',
      'Trip replay',
      'WhatsApp driver summaries',
      'Priority support',
      'Custom alert rules',
    ],
    locked: []
  },
]

export default function Billing() {
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState({ entrySlots: 0, midSlots: 0, topSlots: 0, message: '' })
  const [loading, setLoading]     = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')

  async function handleRequest() {
    if (!form.entrySlots && !form.midSlots && !form.topSlots) {
      setError('Please select at least one plan')
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.post('/api/upgrade/request', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Billing & Plans</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Choose the right plan for your fleet
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
        {PLANS.map(plan => (
          <div
            key={plan.id}
            className={`bg-white rounded-xl border-2 p-6 cursor-pointer transition ${
              selected === plan.id
                ? 'border-blue-500 shadow-md'
                : 'border-gray-200 hover:border-blue-300'
            }`}
            onClick={() => setSelected(plan.id)}
          >
            <div className='flex items-center justify-between mb-4'>
              <h2 className='text-lg font-bold text-gray-900'>{plan.name}</h2>
              {selected === plan.id && (
                <span className='text-xs font-medium px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full'>
                  Selected
                </span>
              )}
            </div>

            <div className='mb-4'>
              <span className='text-3xl font-bold text-gray-900'>${plan.price}</span>
              <span className='text-sm text-gray-500 ml-1'>{plan.per}</span>
              <p className='text-xs text-gray-400 mt-1'>{plan.slots}</p>
            </div>

            <div className='space-y-2 mb-4'>
              {plan.features.map((f, i) => (
                <div key={i} className='flex items-center gap-2'>
                  <span className='text-teal-500 text-sm'>✓</span>
                  <span className='text-sm text-gray-700'>{f}</span>
                </div>
              ))}
              {plan.locked.map((f, i) => (
                <div key={i} className='flex items-center gap-2'>
                  <span className='text-gray-300 text-sm'>🔒</span>
                  <span className='text-sm text-gray-400'>{f}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {submitted ? (
        <div className='bg-teal-50 border border-teal-200 rounded-xl p-6 text-center'>
          <p className='text-teal-700 font-semibold text-lg'>Request sent successfully</p>
          <p className='text-teal-600 text-sm mt-1'>
            We will contact you within 24 hours to confirm your plan and payment details.
          </p>
        </div>
      ) : (
        <div className='bg-white rounded-xl border border-gray-200 p-6 max-w-lg'>
          <h3 className='text-sm font-semibold text-gray-700 mb-4'>
            Request a plan — we will contact you to arrange payment
          </h3>

          <div className='space-y-3 mb-4'>
            <div className='flex items-center gap-3'>
              <label className='text-sm text-gray-600 w-32'>Entry slots</label>
              <input
                type='number'
                min='0'
                value={form.entrySlots}
                onChange={e => setForm(f => ({ ...f, entrySlots: e.target.value }))}
                className='w-24 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-sm text-gray-400'>× $18/month</span>
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-sm text-gray-600 w-32'>Mid slots</label>
              <input
                type='number'
                min='0'
                value={form.midSlots}
                onChange={e => setForm(f => ({ ...f, midSlots: e.target.value }))}
                className='w-24 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-sm text-gray-400'>× $25/month</span>
            </div>
            <div className='flex items-center gap-3'>
              <label className='text-sm text-gray-600 w-32'>Top slots</label>
              <input
                type='number'
                min='0'
                value={form.topSlots}
                onChange={e => setForm(f => ({ ...f, topSlots: e.target.value }))}
                className='w-24 h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <span className='text-sm text-gray-400'>× $45/month</span>
            </div>
          </div>

          <div className='mb-4'>
            <label className='block text-sm text-gray-600 mb-1'>
              Message (optional)
            </label>
            <textarea
              value={form.message}
              onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
              placeholder='Tell us about your fleet...'
              rows={3}
              className='w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
            />
          </div>

          {error && (
            <p className='text-sm text-red-500 mb-3'>{error}</p>
          )}

          <button
            onClick={handleRequest}
            disabled={loading}
            className='w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
          >
            {loading ? 'Sending...' : 'Request plan upgrade'}
          </button>

          <p className='text-xs text-gray-400 mt-3 text-center'>
            No automatic charges. We will contact you to confirm payment.
          </p>
        </div>
      )}

    </div>
  )
}