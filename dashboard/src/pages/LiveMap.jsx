import { useEffect, useRef, useState } from 'react'
import { useFleetStore } from '../store/fleetStore'
import { useSocket } from '../hooks/useSocket'
import api from '../lib/api'

export default function LiveMap() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const markers      = useRef({})
  const [selectedImei, setSelectedImei] = useState(null)
  const [mapReady, setMapReady]         = useState(false)
  const [activeFilter, setActiveFilter] = useState('all')
  const setFleet  = useFleetStore(s => s.setFleet)
  const getAllVans = useFleetStore(s => s.getAllVans)
  const updateVan = useFleetStore(s => s.updateVan)
  const selectedVan = selectedImei ? getAllVans().find(v => v.imei === selectedImei) ?? null : null

  useSocket((vanData) => {
    updateVan(vanData)
    if (mapReady) {
      if (!markers.current[vanData.imei]) {
        const mapboxgl = window._mapboxgl
        if (mapboxgl) addMarker(mapboxgl, { ...vanData, name: vanData.imei })
      } else {
        updateMarker(vanData)
      }
    }
  })

  useEffect(() => {
    async function init() {
      try {
        const res = await api.get('/api/telemetry/live')
        setFleet(res.data)
      } catch (err) {
        console.error('LiveMap load error:', err.message)
      }
    }
    init()
  }, [])

  useEffect(() => {
    async function initMap() {
      const mapboxgl = (await import('mapbox-gl')).default
      window._mapboxgl = mapboxgl
      await import('mapbox-gl/dist/mapbox-gl.css')

      mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style:     'mapbox://styles/mapbox/streets-v12',
        center:    [151.2093, -33.8688],
        zoom:      11,
      })

      map.current.on('load', () => {
        setMapReady(true)
        renderAllMarkers(mapboxgl)
      })

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')
    }

    initMap()

    return () => map.current?.remove()
  }, [])

  function renderAllMarkers(mapboxgl) {
    const vans = getAllVans()
    for (const van of vans) {
      if (van.latitude && van.longitude) {
        addMarker(mapboxgl, van)
      }
    }
  }

  function addMarker(mapboxgl, van) {
    const el = document.createElement('div')
    el.className = 'van-marker'
    el.style.cssText = `
      width: 12px; height: 12px; border-radius: 50%;
      background: ${van.speed > 0 ? '#14b8a6' : van.ignition ? '#f59e0b' : '#9ca3af'};
      border: 2px solid white;
      box-shadow: 0 0 0 2px ${van.speed > 0 ? '#14b8a6' : '#9ca3af'};
      cursor: pointer;
    `

    const marker = new mapboxgl.Marker(el)
      .setLngLat([van.longitude, van.latitude])
      .addTo(map.current)

    el.addEventListener('click', () => setSelectedImei(van.imei))
    markers.current[van.imei] = marker
  }

  function updateMarker(van) {
    const marker = markers.current[van.imei]
    if (marker && van.latitude && van.longitude) {
      marker.setLngLat([van.longitude, van.latitude])
    }
  }

  const vans = getAllVans()
  const filteredVans = vans.filter(v => {
    if (activeFilter === 'all')       return true
    if (activeFilter === 'moving')    return v.speed > 0
    if (activeFilter === 'idle')      return v.speed === 0 && v.ignition
    if (activeFilter === 'stopped')   return !v.ignition && v.speed === 0
    if (activeFilter === 'overspeed') return v.speed > 110
    return true
  })

  return (
    <div className='flex h-[calc(100vh-60px)] md:h-screen'>

      <div className='hidden md:flex flex-col w-72 bg-white border-r border-gray-200 overflow-y-auto'>
        <div className='p-4 border-b border-gray-200'>
          <h2 className='text-sm font-semibold text-gray-700 mb-3'>
            Fleet — {vans.length} vans
          </h2>
          <div className='flex flex-wrap gap-1.5'>
            {['all','moving','idle','stopped','overspeed'].map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize transition ${
                  activeFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className='divide-y divide-gray-100'>
          {filteredVans.map((van, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedImei(van.imei)
                if (map.current && van.latitude && van.longitude) {
                  map.current.flyTo({
                    center: [van.longitude, van.latitude],
                    zoom: 15,
                  })
                }
              }}
              className='w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left'
            >
              <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                van.speed > 0
                  ? 'bg-teal-500'
                  : van.ignition
                  ? 'bg-amber-500'
                  : 'bg-gray-400'
              }`} />
              <div className='flex-1 min-w-0'>
                <div className='flex items-center justify-between'>
                  <p className='text-sm font-medium text-gray-800 truncate'>
                    {van.name || van.imei}
                  </p>
                  <span className='text-xs text-gray-400 flex-shrink-0 ml-2'>
                    {van.speed ?? 0} km/h
                  </span>
                </div>
                <div className='flex items-center justify-between mt-0.5'>
                  <p className='text-xs text-gray-400 truncate'>{van.address || '—'}</p>
                  {van.todayKm != null && (
                    <span className='text-xs text-gray-400 flex-shrink-0 ml-2'>{van.todayKm} km</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className='flex-1 relative'>
        <div ref={mapContainer} className='w-full h-full' />

        {selectedVan && (
          <div className='absolute bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6 md:bottom-6 w-80 bg-white rounded-xl border border-gray-200 shadow-lg p-4 z-10'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-sm font-semibold text-gray-800'>
                {selectedVan.name || selectedVan.imei}
              </h3>
              <button
                onClick={() => setSelectedImei(null)}
                className='text-gray-400 hover:text-gray-600 text-lg leading-none'
              >
                ×
              </button>
            </div>
            <div className='grid grid-cols-2 gap-3'>
              <VanStat label='Speed'    value={`${selectedVan.speed ?? 0} km/h`} />
              <VanStat label='Status'   value={
                selectedVan.speed > 0 ? 'Moving'
                : selectedVan.ignition ? 'Idle'
                : 'Stopped'
              } />
              <VanStat label='Voltage'  value={`${selectedVan.externalVoltage ?? selectedVan.batteryVoltage ?? '--'} V`} />
              <VanStat label='Odometer' value={`${selectedVan.odometer ?? '--'} km`} />
              <VanStat label='Today'    value={selectedVan.todayKm != null ? `${selectedVan.todayKm} km` : '--'} />
              <VanStat label='Signal'   value={selectedVan.gsmSignal != null ? `${selectedVan.gsmSignal}/5` : '--'} />
            </div>
            {selectedVan.address && (
              <p className='text-xs text-gray-500 mt-3'>📍 {selectedVan.address}</p>
            )}
            {selectedVan.stateChangedAt && (
              <p className='text-xs text-gray-400 mt-1'>
                {selectedVan.speed > 0 ? 'Moving' : selectedVan.ignition ? 'Idle' : 'Stopped'} for {sinceLabel(selectedVan.stateChangedAt)}
              </p>
            )}
          </div>
        )}
      </div>

    </div>
  )
}

function sinceLabel(ts) {
  if (!ts) return null
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1)  return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function VanStat({ label, value }) {
  return (
    <div className='bg-gray-50 rounded-lg px-3 py-2'>
      <p className='text-xs text-gray-400 mb-0.5'>{label}</p>
      <p className='text-sm font-medium text-gray-700'>{value}</p>
    </div>
  )
}