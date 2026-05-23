import { useState } from 'react'
import api from '../../lib/api'

export default function VehiclesSection({ vehicles, setVehicles, loading }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', imei: '', registration: '', make: '', model: '', year: '' })

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
        <button onClick={() => setShowAdd(true)} className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg'>
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
            <input key={f.key} value={form[f.key]} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
          ))}
          <div className='flex gap-2'>
            <button onClick={addVan} className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
            <button onClick={() => setShowAdd(false)} className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
          </div>
        </div>
      )}

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
        {vehicles.length === 0
          ? <p className='text-sm text-gray-400 p-6 text-center'>No vehicles yet — add your first van above</p>
          : vehicles.map((v, i) => (
            <div key={i} className='px-5 py-3.5 flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>{v.name}</p>
                <p className='text-xs text-gray-400'>{v.registration || 'No rego'} · {v.imei}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                v.tier === 'top' ? 'bg-purple-100 text-purple-700' :
                v.tier === 'mid' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}>{v.tier || 'entry'}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}