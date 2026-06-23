import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Billing() {
  const [status,   setStatus]   = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    api.get('/api/billing/status').then(r => setStatus(r.data)).catch(() => {})

    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      api.get('/api/billing/status').then(r => setStatus(r.data)).catch(() => {})
    }
  }, [])

  async function handleSubscribe() {
    setLoading(true)
    try {
      const res = await api.post('/api/billing/checkout', { quantity })
      window.location.href = res.data.url
    } catch (err) {
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    try {
      const res = await api.post('/api/billing/portal')
      window.location.href = res.data.url
    } catch (err) {
      alert('Failed to open billing portal. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const isActive = status?.subscriptionStatus === 'active'

  return (
    <div className='max-w-lg mx-auto p-6'>
      <h2 className='text-xl font-semibold text-gray-800 mb-1'>Billing</h2>
      <p className='text-sm text-gray-400 mb-6'>Manage your Clarity Fleet subscription</p>

      {/* Status */}
      {status && (
        <div className='bg-gray-50 rounded-xl p-4 mb-6'>
          <div className='flex items-center justify-between'>
            <span className='text-sm text-gray-600'>Subscription status</span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isActive ? 'bg-teal-50 text-teal-600' : 'bg-red-50 text-red-600'
            }`}>
              {status.subscriptionStatus === 'active'         ? 'Active'
               : status.subscriptionStatus === 'cancelled'    ? 'Cancelled'
               : status.subscriptionStatus === 'payment_failed' ? 'Payment Failed'
               : 'Inactive'}
            </span>
          </div>
          {isActive && (
            <div className='flex items-center justify-between mt-2'>
              <span className='text-sm text-gray-600'>Vehicle slots</span>
              <span className='text-sm font-semibold text-gray-800'>{status.slots} vans</span>
            </div>
          )}
        </div>
      )}

      {/* Plan card */}
      <div className='border border-gray-200 rounded-xl p-5 mb-6'>
        <div className='flex items-start justify-between mb-3'>
          <div>
            <p className='text-base font-semibold text-gray-800'>Clarity Fleet</p>
            <p className='text-xs text-gray-400 mt-0.5'>All features included</p>
          </div>
          <div className='text-right'>
            <p className='text-xl font-bold text-gray-800'>$19.99</p>
            <p className='text-xs text-gray-400'>per van / month</p>
          </div>
        </div>
        <ul className='space-y-1.5 mb-4'>
          {['Live GPS tracking','Trip history & replay','Remote engine cut','Driver behaviour scoring','Geofence alerts','FBT logbook','Maintenance scheduler'].map(f => (
            <li key={f} className='flex items-center gap-2 text-sm text-gray-600'>
              <span className='text-teal-500'>✓</span> {f}
            </li>
          ))}
        </ul>

        {!isActive ? (
          <div>
            <div className='flex items-center gap-3 mb-3'>
              <label className='text-sm text-gray-600'>Number of vans</label>
              <div className='flex items-center gap-2'>
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className='w-7 h-7 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center'>−</button>
                <span className='w-8 text-center text-sm font-semibold'>{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)}
                  className='w-7 h-7 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center'>+</button>
              </div>
            </div>
            <div className='flex items-center justify-between text-xs text-gray-400 mb-3'>
              <span>Total per month</span>
              <span className='font-semibold text-gray-700'>${(quantity * 19.99).toFixed(2)} AUD</span>
            </div>
            <button onClick={handleSubscribe} disabled={loading}
              className='w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-50'>
              {loading ? 'Redirecting...' : `Subscribe — ${quantity} van${quantity > 1 ? 's' : ''}`}
            </button>
          </div>
        ) : (
          <button onClick={handlePortal} disabled={loading}
            className='w-full h-11 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition disabled:opacity-50'>
            {loading ? 'Opening...' : 'Manage subscription'}
          </button>
        )}
      </div>

      <p className='text-xs text-gray-400 text-center'>
        Payments processed securely by Stripe. Cancel anytime.
      </p>
    </div>
  )
}