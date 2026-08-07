import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function FbtLogbook() {
  const [trips, setTrips]       = useState([])
  const [summary, setSummary]   = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [vehicleId, setVehicleId] = useState('')
  const [classifying, setClassifying] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [vRes, tRes] = await Promise.all([
          api.get('/vehicles'),
          api.get('/fbt'),
        ])
        setVehicles(vRes.data)
        setTrips(tRes.data)
        loadSummary()
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function loadSummary() {
    try {
      const res = await api.get('/fbt/summary')
      setSummary(res.data)
    } catch (err) {
      console.error(err.message)
    }
  }

  async function classify(tripId, classification) {
    try {
      const res = await api.put(`/fbt/${tripId}/classify`, { classification })
      setTrips(t => t.map(trip =>
        trip.id === tripId ? res.data : trip
      ))
      setClassifying(null)
      loadSummary()
    } catch (err) {
      console.error(err.message)
    }
  }

  const unclassified = trips.filter(t => !t.classification)
  const classified   = trips.filter(t =>  t.classification)

  function formatDate(d) {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-AU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>FBT Logbook</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Classify trips for Fringe Benefits Tax reporting
        </p>
      </div>

      {summary && (
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 mb-6'>
          <SummaryCard label='Business km'    value={`${summary.businessKm?.toFixed(0) ?? 0} km`} color='blue' />
          <SummaryCard label='Personal km'    value={`${summary.personalKm?.toFixed(0) ?? 0} km`} color='gray' />
          <SummaryCard label='Business trips' value={summary.businessTrips ?? 0} color='teal' />
          <SummaryCard label='Unclassified'   value={summary.unclassifiedTrips ?? 0} color='amber' />
        </div>
      )}

      {unclassified.length > 0 && (
        <div className='mb-6'>
          <h2 className='text-sm font-semibold text-gray-600 mb-3'>
            Needs classification ({unclassified.length})
          </h2>
          <div className='bg-white rounded-xl border border-amber-200 divide-y divide-gray-100 overflow-hidden'>
            {unclassified.map((trip, i) => (
              <div key={i} className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    {vehicles.find(v => v.id === trip.vehicleId)?.name || trip.vehicleId}
                  </p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {formatDate(trip.startTime)} — {trip.distanceKm?.toFixed(1) ?? '--'} km
                  </p>
                </div>
                <div className='flex gap-2'>
                  <button
                    onClick={() => classify(trip.id, 'business')}
                    className='h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition'
                  >
                    Business
                  </button>
                  <button
                    onClick={() => classify(trip.id, 'personal')}
                    className='h-7 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition'
                  >
                    Personal
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {classified.length > 0 && (
        <div>
          <h2 className='text-sm font-semibold text-gray-600 mb-3'>
            Classified ({classified.length})
          </h2>
          <div className='bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden'>
            {classified.map((trip, i) => (
              <div key={i} className='flex items-center justify-between px-4 py-3'>
                <div>
                  <p className='text-sm font-medium text-gray-800'>
                    {vehicles.find(v => v.id === trip.vehicleId)?.name || trip.vehicleId}
                  </p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {formatDate(trip.startTime)} — {trip.distanceKm?.toFixed(1) ?? '--'} km
                  </p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  trip.classification === 'business'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {trip.classification}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && <p className='text-sm text-gray-400'>Loading trips...</p>}

      {!loading && trips.length === 0 && (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-400'>No trips found</p>
        </div>
      )}

    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    blue:  'text-blue-600',
    gray:  'text-gray-600',
    teal:  'text-teal-600',
    amber: 'text-amber-600',
  }
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4'>
      <p className='text-xs text-gray-500 mb-1'>{label}</p>
      <p className={`text-xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  )
}