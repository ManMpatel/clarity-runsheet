import { useState, useEffect } from 'react'
import api from '../../lib/api'

function StatusDot({ state, lastSeen }) {
  const config = {
    online:  { color: 'bg-green-500',  label: 'Live' },
    idle:    { color: 'bg-orange-400', label: 'Idle' },
    offline: { color: 'bg-red-400',    label: 'Offline' },
  }
  const { color, label } = config[state] || config.offline
  const lastSeenText = lastSeen
    ? `Last seen ${new Date(lastSeen).toLocaleTimeString('en-AU')}`
    : 'No data received'

  return (
    <div className='flex items-center gap-1.5' title={lastSeenText}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
      <span className='text-xs text-gray-400'>{label}</span>
    </div>
  )
}

export default function VehiclesSection({ vehicles, setVehicles, loading }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm]       = useState({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
  const [status, setStatus]   = useState({})

  useEffect(() => {
    if (vehicles.length === 0) return
    api.get('/api/vehicles/status')
      .then(res => {
        const map = {}
        res.data.forEach(s => { map[s.vehicleId] = s })
        setStatus(map)
      })
      .catch(() => {})
  }, [vehicles])

  async function addVan() {
    try {
      const res = await api.post('/api/vehicles', form)
      setVehicles(v => [...v, res.data])
      setShowAdd(false)
      setForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
    } catch (err) {
      console.error(err.message)
    }
  }

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Vehicles</h1>
          <p className='text-sm text-gray-500'>{vehicles.length} registered</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg'>
          + Add van
        </button>
      </div>

      {showAdd && (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4 space-y-3'>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>New vehicle</h3>
          {[
            { key: 'name',         placeholder: "Van 1 — John's HiAce" },
            { key: 'imei',         placeholder: '15-digit IMEI' },
            { key: 'registration', placeholder: 'ABC123' },
            { key: 'make',         placeholder: 'Toyota' },
            { key: 'model',        placeholder: 'HiAce' },
            { key: 'year',         placeholder: '2022' },
          ].map(f => (
            <input key={f.key} value={form[f.key]}
              onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
          ))}
          <div className='flex gap-2'>
            <button onClick={addVan}
              className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
            <button onClick={() => setShowAdd(false)}
              className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
          </div>
        </div>
      )}

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
        {vehicles.length === 0 ? (
          <p className='text-sm text-gray-400 p-6 text-center'>No vehicles yet — add your first van above</p>
        ) : vehicles.map((v, i) => {
          const s = status[v._id] || { state: 'offline', lastSeen: null }
          return (
            <div key={i} className='px-5 py-3.5 flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-white'>{v.name}</p>
                  <p className='text-xs text-gray-400'>
                    {v.registration || 'No rego'} · {v.imei}
                    {s.lastSeen && (
                      <span className='ml-2'>· {new Date(s.lastSeen).toLocaleTimeString('en-AU')}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3'>
                <StatusDot state={s.state} lastSeen={s.lastSeen} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                  v.tier === 'mid' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{v.tier || 'entry'}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className='flex items-center gap-4 mt-4 px-1'>
        <div className='flex items-center gap-1.5'>
          <div className='w-2 h-2 rounded-full bg-green-500' />
          <span className='text-xs text-gray-400'>Live — data in last 2 min</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-2 h-2 rounded-full bg-orange-400' />
          <span className='text-xs text-gray-400'>Idle — last 15 min</span>
        </div>
        <div className='flex items-center gap-1.5'>
          <div className='w-2 h-2 rounded-full bg-red-400' />
          <span className='text-xs text-gray-400'>Offline</span>
        </div>
      </div>
    </div>
  )
}