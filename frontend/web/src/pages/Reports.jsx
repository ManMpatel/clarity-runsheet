import { useState } from 'react'
import api from '../lib/api'

const REPORT_TYPES = [
  { id: 'driver-scores', label: 'Driver Scores',   desc: 'Weekly safety scores for all drivers', tier: 'entry' },
  { id: 'trip-summary',  label: 'Trip Summary',    desc: 'Distance, duration and trip counts',   tier: 'entry' },
  { id: 'fuel-idle',     label: 'Fuel & Idle',     desc: 'Idle time and fuel usage analysis',    tier: 'mid' },
  { id: 'vehicle-health',label: 'Vehicle Health',  desc: 'Diagnostics and fault code history',   tier: 'mid' },
]

export default function Reports() {
  const [selected, setSelected] = useState('driver-scores')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleGenerate() {
    if (!from || !to) {
      setError('Please select a date range')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await api.get(`/reports/${selected}?from=${from}&to=${to}`)
      setData(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This report requires a higher subscription tier')
      } else {
        setError('Failed to generate report')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Reports</h1>
        <p className='text-sm text-gray-500 mt-1'>Generate and download fleet reports</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-6'>
        {REPORT_TYPES.map(r => (
          <button
            key={r.id}
            onClick={() => { setSelected(r.id); setData(null) }}
            className={`p-4 rounded-xl border text-left transition ${
              selected === r.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-blue-300'
            }`}
          >
            <p className='text-sm font-semibold text-gray-800'>{r.label}</p>
            <p className='text-xs text-gray-400 mt-1'>{r.desc}</p>
            {r.tier === 'mid' && (
              <span className='text-xs text-amber-600 mt-2 inline-block'>
                Mid tier+
              </span>
            )}
          </button>
        ))}
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-5 mb-6'>
        <h2 className='text-sm font-semibold text-gray-700 mb-4'>Date range</h2>
        <div className='flex flex-wrap gap-3 items-end'>
          <div>
            <label className='block text-xs text-gray-500 mb-1'>From</label>
            <input
              type='date'
              value={from}
              onChange={e => setFrom(e.target.value)}
              className='h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <div>
            <label className='block text-xs text-gray-500 mb-1'>To</label>
            <input
              type='date'
              value={to}
              onChange={e => setTo(e.target.value)}
              className='h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className='h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
        </div>
        {error && (
          <p className='text-sm text-red-500 mt-3'>{error}</p>
        )}
      </div>

      {data && (
        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-sm font-semibold text-gray-700'>
              {REPORT_TYPES.find(r => r.id === selected)?.label} Results
            </h2>
          </div>
          <pre className='text-xs text-gray-600 overflow-auto max-h-96 bg-gray-50 rounded-lg p-4'>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}

    </div>
  )
}