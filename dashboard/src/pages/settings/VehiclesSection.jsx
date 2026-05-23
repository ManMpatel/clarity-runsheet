import { useState, useEffect, useRef } from 'react'
import api from '../../lib/api'
import Toast from '../../components/Toast'

function StatusDot({ state, lastSeen }) {
  const config = {
    online:  { color: 'bg-green-500',  label: 'Live' },
    idle:    { color: 'bg-orange-400', label: 'Idle' },
    offline: { color: 'bg-red-400',    label: 'Offline' },
  }
  const { color, label } = config[state] || config.offline
  return (
    <div className='flex items-center gap-1.5' title={lastSeen ? `Last seen ${new Date(lastSeen).toLocaleTimeString('en-AU')}` : 'No data'}>
      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${color}`} />
      <span className='text-xs text-gray-400'>{label}</span>
    </div>
  )
}

function KebabMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className='relative' ref={ref}>
      <button onClick={() => setOpen(!open)}
        className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400'>
        ⋮
      </button>
      {open && (
        <div className='absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10 min-w-[100px]'>
          <button onClick={() => { onEdit(); setOpen(false) }}
            className='w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'>
            ✏️ Edit
          </button>
          <button onClick={() => { onDelete(); setOpen(false) }}
            className='w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  )
}

export default function VehiclesSection({ vehicles, setVehicles, loading }) {
  const [showAdd, setShowAdd]   = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
  const [status, setStatus]     = useState({})
  const [toast, setToast]       = useState(null)

  useEffect(() => {
    if (vehicles.length === 0) return
    api.get('/api/vehicles/status')
      .then(res => {
        const map = {}
        res.data.forEach(s => { map[s.vehicleId] = s })
        setStatus(map)
      }).catch(() => {})
  }, [vehicles])

  async function addVehicle() {
    try {
      const res = await api.post('/api/vehicles', form)
      setVehicles(v => [...v, res.data])
      setShowAdd(false)
      setForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
      setToast({ message: 'Vehicle added', type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' })
    }
  }

  async function deleteVehicle(id) {
    if (!confirm('Remove this vehicle?')) return
    try {
      await api.delete(`/api/vehicles/${id}`)
      setVehicles(v => v.filter(x => x._id !== id))
      setToast({ message: 'Vehicle removed', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to remove', type: 'error' })
    }
  }

  const fields = [
    { key: 'name',         placeholder: "Van 1 — John's HiAce" },
    { key: 'imei',         placeholder: '15-digit IMEI' },
    { key: 'registration', placeholder: 'ABC123' },
    { key: 'make',         placeholder: 'Toyota' },
    { key: 'model',        placeholder: 'HiAce' },
    { key: 'year',         placeholder: '2022' },
  ]

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className='flex items-center justify-between mb-4'>
        <div>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Vehicles</h1>
          <div className='flex items-center gap-4'>
            <p className='text-sm text-gray-500'>{vehicles.length} registered</p>
            <div className='flex items-center gap-3'>
              {[
                { color: 'bg-green-500', label: 'Live' },
                { color: 'bg-orange-400', label: 'Idle' },
                { color: 'bg-red-400', label: 'Offline' },
              ].map(s => (
                <div key={s.label} className='flex items-center gap-1'>
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className='text-xs text-gray-400'>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)}
          className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg'>
          + Add Vehicle
        </button>
      </div>

      {showAdd && (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4 space-y-3'>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>New vehicle</h3>
          {fields.map(f => (
            <input key={f.key} value={form[f.key]}
              onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
          ))}
          <div className='flex gap-2'>
            <button onClick={addVehicle} className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
            <button onClick={() => setShowAdd(false)} className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
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
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>{v.name}</p>
                <p className='text-xs text-gray-400 mt-0.5'>
                  <span className='text-gray-500'>Rego:</span> {v.registration || '—'}
                  <span className='mx-2'>·</span>
                  <span className='text-gray-500'>IMEI:</span> {v.imei?.slice(0, 8)}…{v.imei?.slice(-4)}
                </p>
              </div>
              <div className='flex items-center gap-3 flex-shrink-0'>
                <StatusDot state={s.state} lastSeen={s.lastSeen} />
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                  v.tier === 'mid' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>Plan: {v.tier || 'entry'}</span>
                <KebabMenu
                  onEdit={() => setEditing(v)}
                  onDelete={() => deleteVehicle(v._id)}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}