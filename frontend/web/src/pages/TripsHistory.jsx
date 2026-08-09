import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

export default function TripsHistory() {
  const [trips, setTrips]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [selected,      setSelected]      = useState(null)
  const [replayPoints,  setReplayPoints]  = useState([])
  const [replayLoading, setReplayLoading] = useState(false)
  const [showReplay,    setShowReplay]    = useState(false)
  const [vehicles, setVehicles] = useState([])
  const [filters, setFilters]   = useState({
    vehicleId: '',
    from: '',
    to: '',
  })

  useEffect(() => {
    async function loadVehicles() {
      try {
        const res = await api.get('/vehicles')
        setVehicles(res.data)
      } catch (err) {
        console.error(err.message)
      }
    }
    loadVehicles()
    loadTrips()
  }, [])

  async function loadTrips() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.vehicleId) params.append('vehicleId', filters.vehicleId)
      if (filters.from)      params.append('from', filters.from)
      if (filters.to)        params.append('to', filters.to)

      const res = await api.get(`/trips?${params}`)
      setTrips(res.data.trips || [])
    } catch (err) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  function formatDuration(mins) {
    if (!mins) return '--'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  function formatDate(date) {
    if (!date) return '--'
    return new Date(date).toLocaleString('en-AU', {
      day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    })
  }

  async function handleReplay(tripId) {
    setReplayLoading(true)
    setReplayPoints([])
    try {
      const res = await api.get(`/trips/${tripId}/replay`)
      setReplayPoints(res.data.points || [])
    } catch (err) {
      console.error('Replay failed', err.message)
    } finally {
      setReplayLoading(false)
    }
  }

  async function handleReplay(tripId) {
    setReplayLoading(true)
    setReplayPoints([])
    try {
      const res = await api.get(`/trips/${tripId}/replay`)
      setReplayPoints(res.data.points || [])
      setShowReplay(true)
    } catch (err) {
      console.error('Replay failed', err.message)
    } finally {
      setReplayLoading(false)
    }
  }

  function closeModal() {
    setSelected(null)
    setShowReplay(false)
    setReplayPoints([])
  }

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Trips & History</h1>
        <p className='text-sm text-gray-500 mt-1'>
          View and replay all vehicle trips
        </p>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-4 mb-6'>
        <div className='flex flex-wrap gap-3'>
          <select
            value={filters.vehicleId}
            onChange={e => setFilters(f => ({ ...f, vehicleId: e.target.value }))}
            className='h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          >
            <option value=''>All vehicles</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>

          <input
            type='date'
            value={filters.from}
            onChange={e => setFilters(f => ({ ...f, from: e.target.value }))}
            className='h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />

          <input
            type='date'
            value={filters.to}
            onChange={e => setFilters(f => ({ ...f, to: e.target.value }))}
            className='h-9 px-3 rounded-lg border border-gray-300 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />

          <button
            onClick={loadTrips}
            className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'
          >
            Search
          </button>
        </div>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Vehicle</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Start</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>End</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Distance</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>Duration</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide'>FBT</th>
                <th className='px-4 py-3'></th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {loading ? (
                <tr>
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-gray-400'>
                    Loading trips...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={7} className='px-4 py-8 text-center text-sm text-gray-400'>
                    No trips found
                  </td>
                </tr>
              ) : (
                trips.map((trip, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-gray-50 cursor-pointer transition ${
                      selected?.id === trip.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelected(trip)}
                  >
                    <td className='px-4 py-3 font-medium text-gray-800'>
                      {trip.vehicleName || trip.vehicleId}
                    </td>
                    <td className='px-4 py-3 text-gray-600'>
                      {formatDate(trip.startTime)}
                    </td>
                    <td className='px-4 py-3 text-gray-600'>
                      {formatDate(trip.endTime)}
                    </td>
                    <td className='px-4 py-3 text-gray-600'>
                      {trip.distanceKm ? `${Number(trip.distanceKm).toFixed(1)} km` : '--'}
                    </td>
                    <td className='px-4 py-3 text-gray-600'>
                      {formatDuration(trip.durationMinutes)}
                    </td>
                    <td className='px-4 py-3'>
                      {trip.classification ? (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          trip.classification === 'business'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {trip.classification}
                        </span>
                      ) : (
                        <span className='text-xs text-gray-400'>Unclassified</span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <button className='text-xs text-blue-600 hover:underline'>
                        Replay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
          <div className={`bg-white rounded-xl w-full overflow-hidden ${showReplay ? 'max-w-3xl' : 'max-w-md'}`}>

            {showReplay ? (
              <>
                <div className='flex items-center justify-between px-5 py-4 border-b border-gray-100'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>{selected.vehicleName || 'Trip replay'}</p>
                    <p className='text-xs text-gray-400'>
                      {formatDate(selected.startTime)} · {Number(selected.distanceKm ?? 0).toFixed(1)} km · {formatDuration(selected.durationMinutes)}
                    </p>
                  </div>
                  <div className='flex items-center gap-2'>
                    <button onClick={() => setShowReplay(false)}
                      className='h-8 px-3 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50'>
                      ← Details
                    </button>
                    <button onClick={closeModal}
                      className='text-gray-400 hover:text-gray-600 text-xl leading-none px-1'>
                      ×
                    </button>
                  </div>
                </div>
                <div style={{ height: '450px' }}>
                  <ReplayMap points={replayPoints} />
                </div>
              </>
            ) : (
              <div className='p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-base font-semibold text-gray-800'>Trip Detail</h3>
                  <button onClick={closeModal} className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
                </div>
                <div className='space-y-3'>
                  <DetailRow label='Vehicle'  value={selected.vehicleName || selected.vehicleId} />
                  <DetailRow label='Start'    value={formatDate(selected.startTime)} />
                  <DetailRow label='End'      value={formatDate(selected.endTime)} />
                  <DetailRow label='Distance' value={selected.distanceKm ? `${Number(selected.distanceKm).toFixed(1)} km` : '--'} />
                  <DetailRow label='Duration' value={formatDuration(selected.durationMinutes)} />
                  <DetailRow label='FBT'      value={selected.classification || 'Unclassified'} />
                </div>
                <div className='flex gap-3 mt-5'>
                  <button
                    onClick={() => handleReplay(selected.id)}
                    disabled={replayLoading}
                    className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50'
                  >
                    {replayLoading ? 'Loading...' : 'Replay trip'}
                  </button>
                  <button onClick={closeModal}
                    className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'>
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className='flex justify-between py-1.5 border-b border-gray-100'>
      <span className='text-sm text-gray-500'>{label}</span>
      <span className='text-sm font-medium text-gray-800'>{value}</span>
    </div>
  )
}

function ReplayMap({ points }) {
  const containerRef = useRef(null)
  const mapRef       = useRef(null)

  useEffect(() => {
    if (!containerRef.current || points.length === 0) return

    async function init() {
      const mapboxgl = (await import('mapbox-gl')).default
      await import('mapbox-gl/dist/mapbox-gl.css')
      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null }

      const coords = points.map(p => p.location.coordinates)

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style:     'mapbox://styles/mapbox/streets-v12',
        center:    coords[0],
        zoom:      12,
      })
      mapRef.current = map

      map.on('load', () => {
        map.addSource('route', {
          type: 'geojson',
          data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
        })
        map.addLayer({
          id: 'route', type: 'line', source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint:  { 'line-color': '#3b82f6', 'line-width': 4 },
        })

        const dot = (color) => {
          const el = document.createElement('div')
          el.style.cssText = `width:12px;height:12px;background:${color};border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4)`
          return el
        }
        new mapboxgl.Marker(dot('#22c55e')).setLngLat(coords[0]).addTo(map)
        new mapboxgl.Marker(dot('#ef4444')).setLngLat(coords[coords.length - 1]).addTo(map)

        const bounds = coords.reduce(
          (b, c) => b.extend(c),
          new mapboxgl.LngLatBounds(coords[0], coords[0])
        )
        map.fitBounds(bounds, { padding: 50 })
      })
    }

    init()
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [points])

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
}
