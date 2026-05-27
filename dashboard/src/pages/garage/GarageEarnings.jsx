import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function GarageEarnings() {
  const [summary, setSummary]       = useState(null)
  const [settlements, setSettlements] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [sRes, pRes] = await Promise.all([
          api.get('/api/referrals/summary'),
          api.get('/api/referrals/settlements'),
        ])
        setSummary(sRes.data)
        setSettlements(pRes.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className='text-sm text-gray-400 p-6'>Loading...</p>

  return (
    <div className='max-w-2xl'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>My Earnings</h1>
        <p className='text-sm text-gray-500 mt-1'>
          20% commission on every active customer device you registered
        </p>
      </div>

      {/* Summary cards */}
      <div className='grid grid-cols-3 gap-4 mb-6'>
        <div className='bg-white border border-gray-200 rounded-xl p-4'>
          <p className='text-xs text-gray-500'>Active devices</p>
          <p className='text-2xl font-bold text-gray-900 mt-1'>
            {summary?.activeDevices || 0}
          </p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl p-4'>
          <p className='text-xs text-gray-500'>Monthly commission</p>
          <p className='text-2xl font-bold text-teal-600 mt-1'>
            ${summary?.monthlyCommission || '0.00'}
          </p>
        </div>
        <div className='bg-white border border-gray-200 rounded-xl p-4'>
          <p className='text-xs text-gray-500'>Total paid out</p>
          <p className='text-2xl font-bold text-gray-900 mt-1'>
            ${summary?.totalEarned || '0.00'}
          </p>
        </div>
      </div>

      {/* Active devices */}
      <div className='bg-white border border-gray-200 rounded-xl overflow-hidden mb-6'>
        <div className='px-4 py-3 border-b border-gray-100'>
          <h2 className='text-sm font-semibold text-gray-700'>Active commissions</h2>
        </div>
        {!summary?.devices?.length ? (
          <p className='text-sm text-gray-400 p-4'>
            No active commissions yet. Commission starts once a customer links their subscription to a device you registered.
          </p>
        ) : (
          <div className='divide-y divide-gray-100'>
            {summary.devices.map((d, i) => (
              <div key={i} className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-mono font-medium text-gray-800'>{d.imei}</p>
                  <p className='text-xs text-gray-400'>{d.deviceType} — {d.tier} tier</p>
                </div>
                <div className='text-right'>
                  <p className='text-sm font-semibold text-teal-600'>${d.commission}/mo</p>
                  <p className='text-xs text-gray-400'>20% of ${d.monthly}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payout history */}
      <div className='bg-white border border-gray-200 rounded-xl overflow-hidden'>
        <div className='px-4 py-3 border-b border-gray-100'>
          <h2 className='text-sm font-semibold text-gray-700'>Payout history</h2>
        </div>
        {!settlements.length ? (
          <p className='text-sm text-gray-400 p-4'>No payouts yet — paid every 2 months by admin</p>
        ) : (
          <div className='divide-y divide-gray-100'>
            {settlements.map((s, i) => (
              <div key={i} className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-medium text-gray-800'>{s.period}</p>
                  {s.note && <p className='text-xs text-gray-400'>{s.note}</p>}
                </div>
                <div className='text-right'>
                  <p className='text-sm font-semibold text-gray-900'>${s.amount}</p>
                  <p className='text-xs text-gray-400'>
                    {new Date(s.settledAt).toLocaleDateString('en-AU')}
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

