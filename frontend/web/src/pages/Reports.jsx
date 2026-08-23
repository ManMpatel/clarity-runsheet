import { useEffect, useMemo, useState } from 'react'
import api from '../lib/api'

const REPORT_TYPES = [
  { id: 'driver-scores', label: 'Driver Scores',   desc: 'Weekly safety scores for all drivers', tier: 'entry' },
  { id: 'trip-summary',  label: 'Trip Summary',    desc: 'Distance, duration and trip counts',   tier: 'entry' },
  { id: 'fuel-idle',     label: 'Fuel & Idle',     desc: 'Idle time and fuel usage analysis',    tier: 'mid' },
  { id: 'vehicle-health',label: 'Vehicle Health',  desc: 'Diagnostics and fault code history',   tier: 'mid' },
]

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function tripSummaryCsv(trips, nameById) {
  const header = 'Vehicle,Start,End,Duration (min),Distance (km)'
  const rows = (trips || []).map((t) => [
    csvEscape(t.vehicleName || nameById[t.vehicleId] || t.vehicleId),
    csvEscape(t.startTime ? new Date(t.startTime).toISOString() : ''),
    csvEscape(t.endTime ? new Date(t.endTime).toISOString() : ''),
    csvEscape(t.durationMinutes ?? ''),
    csvEscape(t.distanceKm ?? ''),
  ].join(','))
  return [header, ...rows].join('\n')
}

function downloadCsv(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatKm(value) {
  const n = Number(value)
  return Number.isFinite(n) ? `${n.toFixed(1)} km` : '—'
}

export default function Reports() {
  const [selected, setSelected] = useState('driver-scores')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [vehicles, setVehicles] = useState([])

  useEffect(() => {
    api.get('/vehicles').then((res) => setVehicles(res.data || [])).catch(() => {})
  }, [])

  const nameById = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v.name])),
    [vehicles],
  )

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

  function handleDownloadCsv() {
    const trips = data?.trips || []
    if (trips.length === 0) return
    downloadCsv(`trip-summary-${from}-to-${to}.csv`, tripSummaryCsv(trips, nameById))
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
            {selected === 'trip-summary' && (data.trips || []).length > 0 && (
              <button
                onClick={handleDownloadCsv}
                className='h-8 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition'
              >
                Download CSV
              </button>
            )}
          </div>
          <ReportResults selected={selected} data={data} nameById={nameById} />
        </div>
      )}

    </div>
  )
}

function ReportResults({ selected, data, nameById }) {
  if (selected === 'driver-scores') {
    const rows = Array.isArray(data) ? data : []
    if (rows.length === 0) return <p className='text-sm text-gray-500'>No scores in this range</p>
    return (
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-xs text-gray-400 border-b border-gray-100'>
            <th className='pb-2 font-medium'>Week starting</th>
            <th className='pb-2 font-medium text-right'>Score</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-100'>
          {rows.map((item, i) => (
            <tr key={item.id || i}>
              <td className='py-2 text-gray-800'>{new Date(item.weekStart).toLocaleDateString('en-AU')}</td>
              <td className='py-2 text-right font-medium text-gray-800'>{item.overallScore ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  if (selected === 'trip-summary') {
    const s = data.summary || {}
    const trips = data.trips || []
    return (
      <div>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-5'>
          <SummaryBox label='Total trips' value={s.totalTrips ?? 0} />
          <SummaryBox label='Total km' value={Number(s.totalKm || 0).toFixed(1)} />
          <SummaryBox label='Total mins' value={s.totalDuration ?? 0} />
          <SummaryBox label='Avg km/trip' value={s.avgKmPerTrip ?? 0} />
        </div>
        {trips.length === 0 ? (
          <p className='text-sm text-gray-500'>No trips in this range</p>
        ) : (
          <table className='w-full text-sm'>
            <thead>
              <tr className='text-left text-xs text-gray-400 border-b border-gray-100'>
                <th className='pb-2 font-medium'>Vehicle</th>
                <th className='pb-2 font-medium'>Date</th>
                <th className='pb-2 font-medium text-right'>Distance</th>
                <th className='pb-2 font-medium text-right'>Duration</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {trips.map((trip, i) => (
                <tr key={trip.id || i}>
                  <td className='py-2 text-gray-800'>{trip.vehicleName || nameById[trip.vehicleId] || 'Vehicle'}</td>
                  <td className='py-2 text-gray-500'>
                    {trip.startTime ? new Date(trip.startTime).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className='py-2 text-right text-gray-800'>{formatKm(trip.distanceKm)}</td>
                  <td className='py-2 text-right text-gray-500'>{trip.durationMinutes != null ? `${trip.durationMinutes} min` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    )
  }

  if (selected === 'fuel-idle') {
    return (
      <div className='grid grid-cols-2 gap-3'>
        <SummaryBox label='Records' value={data.total ?? 0} />
        <SummaryBox label='Idle records' value={data.idleCount ?? 0} />
      </div>
    )
  }

  if (selected === 'vehicle-health') {
    const rows = Array.isArray(data) ? data : []
    if (rows.length === 0) return <p className='text-sm text-gray-500'>No vehicle health data yet</p>
    return (
      <table className='w-full text-sm'>
        <thead>
          <tr className='text-left text-xs text-gray-400 border-b border-gray-100'>
            <th className='pb-2 font-medium'>Vehicle</th>
            <th className='pb-2 font-medium'>Last reading</th>
            <th className='pb-2 font-medium text-right'>DTCs</th>
          </tr>
        </thead>
        <tbody className='divide-y divide-gray-100'>
          {rows.map((item, i) => (
            <tr key={item.vehicle?.id || i}>
              <td className='py-2 text-gray-800'>{item.vehicle?.name || '—'}</td>
              <td className='py-2 text-gray-500'>{item.latest?.time ? new Date(item.latest.time).toLocaleDateString('en-AU') : 'No data yet'}</td>
              <td className='py-2 text-right text-gray-800'>{item.latest?.dtcCount ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return null
}

function SummaryBox({ label, value }) {
  return (
    <div className='bg-gray-50 rounded-lg px-3 py-3 text-center'>
      <p className='text-lg font-semibold text-gray-800'>{value}</p>
      <p className='text-xs text-gray-400 mt-0.5'>{label}</p>
    </div>
  )
}
