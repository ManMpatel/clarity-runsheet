import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

function generateCirclePolygon(lng, lat, radiusMetres, points = 64) {
  const coords = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = (radiusMetres / 111320) * Math.cos(angle)
    const dy = (radiusMetres / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)
    coords.push([lng + dy, lat + dx])
  }
  coords.push(coords[0])
  return { type: 'Polygon', coordinates: [coords] }
}

export default function GeofenceManager() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const marker       = useRef(null)

  const [zones, setZones]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [adding, setAdding]       = useState(false)
  const [selected, setSelected]   = useState(null)
  const [saving, setSaving]       = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [center, setCenter]       = useState({ lng: 151.2093, lat: -33.8688 })
  const [form, setForm]           = useState({
    name: '', alertOnExit: true, alertOnEntry: false, radiusMetres: 500
  })
  const [vehicles, setVehicles]   = useState([])
  const [selectedVehicles, setSelectedVehicles] = useState([])

  useEffect(() => {
    loadZones()
    initMap()
  }, [])

  async function loadZones() {
    try {
      const [zonesRes, vehiclesRes] = await Promise.all([
        api.get('/api/geofences'),
        api.get('/api/vehicles'),
      ])
      setZones(zonesRes.data)
      setVehicles(vehiclesRes.data)
    } catch (err) {
      console.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function initMap() {
    const mapboxgl = (await import('mapbox-gl')).default
    await import('mapbox-gl/dist/mapbox-gl.css')
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [151.2093, -33.8688],
      zoom: 11,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      map.current.addSource('preview', {
        type: 'geojson', data: { type: 'FeatureCollection', features: [] }
      })
      map.current.addLayer({
        id: 'preview-fill', type: 'fill', source: 'preview',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 }
      })
      map.current.addLayer({
        id: 'preview-line', type: 'line', source: 'preview',
        paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [3, 2] }
      })
      map.current.addSource('zones', {
        type: 'geojson', data: { type: 'FeatureCollection', features: [] }
      })
      map.current.addLayer({
        id: 'zones-fill', type: 'fill', source: 'zones',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.1 }
      })
      map.current.addLayer({
        id: 'zones-line', type: 'line', source: 'zones',
        paint: { 'line-color': '#10b981', 'line-width': 2 }
      })
    })
  }

  useEffect(() => {
    if (!map.current) return
    const tryUpdate = () => {
      const source = map.current.getSource('preview')
      if (!source) return
      if (!adding) {
        source.setData({ type: 'FeatureCollection', features: [] })
        if (marker.current) { marker.current.remove(); marker.current = null }
        return
      }
      source.setData({ type: 'Feature', geometry: generateCirclePolygon(center.lng, center.lat, form.radiusMetres) })
      import('mapbox-gl').then(({ default: mapboxgl }) => {
        if (!marker.current) {
          marker.current = new mapboxgl.Marker({ color: '#3b82f6', draggable: true })
            .setLngLat([center.lng, center.lat]).addTo(map.current)
          marker.current.on('dragend', () => {
            const ll = marker.current.getLngLat()
            setCenter({ lng: parseFloat(ll.lng.toFixed(6)), lat: parseFloat(ll.lat.toFixed(6)) })
          })
        } else {
          marker.current.setLngLat([center.lng, center.lat])
        }
      })
    }
    if (map.current.loaded()) tryUpdate()
    else map.current.on('load', tryUpdate)
  }, [adding, form.radiusMetres, center])

  useEffect(() => {
    if (!map.current) return
    const tryUpdate = () => {
      const source = map.current.getSource('zones')
      if (!source) return
      source.setData({
        type: 'FeatureCollection',
        features: zones.filter(z => z.geometry).map(z => ({
          type: 'Feature', geometry: z.geometry, properties: { name: z.name }
        }))
      })
    }
    if (map.current.loaded()) tryUpdate()
    else map.current.on('load', tryUpdate)
  }, [zones])

  async function searchLocation(query) {
    if (!query || query.length < 3) { setSearchResults([]); return }
    setSearching(true)
    try {
      const token = import.meta.env.VITE_MAPBOX_TOKEN
      const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&country=AU&limit=5`)
      const data = await res.json()
      setSearchResults(data.features || [])
    } catch (err) { console.error(err) }
    finally { setSearching(false) }
  }

  function selectLocation(feature) {
    const [lng, lat] = feature.center
    setCenter({ lng: parseFloat(lng.toFixed(6)), lat: parseFloat(lat.toFixed(6)) })
    setSearchQuery(feature.place_name)
    setSearchResults([])
    map.current.flyTo({ center: [lng, lat], zoom: 14 })
  }

  function startAdding() {
    const c = map.current.getCenter()
    setCenter({ lng: parseFloat(c.lng.toFixed(6)), lat: parseFloat(c.lat.toFixed(6)) })
    setForm({ name: '', alertOnExit: true, alertOnEntry: false, radiusMetres: 500 })
    setSearchQuery('')
    setSelectedVehicles([])
    setSelected(null)
    setAdding(true)
  }

  function cancelAdding() {
    setAdding(false)
    setSearchQuery('')
    setSearchResults([])
  }

  async function handleSave() {
    if (!form.name) return
    setSaving(true)
    try {
      const geometry = generateCirclePolygon(center.lng, center.lat, form.radiusMetres)
      const res = await api.post('/api/geofences', {
        ...form,
        geometry,
        centre: center,
        radiusMetres: form.radiusMetres,
        vehicleIds: selectedVehicles,
      })
      setZones(z => [res.data, ...z])
      cancelAdding()
    } catch (err) { console.error(err.message) }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/geofences/${id}`)
      setZones(z => z.filter(zone => zone._id !== id))
      setSelected(null)
    } catch (err) { console.error(err.message) }
  }

  const radiusLabel = form.radiusMetres >= 1000
    ? `${(form.radiusMetres / 1000).toFixed(1)} km`
    : `${form.radiusMetres} m`

  return (
    <div className='flex h-[calc(100vh-60px)] md:h-screen'>

      <div className='hidden md:flex flex-col w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-gray-700 dark:text-gray-300'>Geofence Zones</h2>
          {!adding && (
            <button onClick={startAdding}
              className='text-xs px-3 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium'>
              + New zone
            </button>
          )}
        </div>

        {adding && (
          <div className='p-4 border-b border-gray-200 dark:border-gray-800 space-y-4 overflow-y-auto'>
            <div className='flex items-center justify-between'>
              <p className='text-sm font-semibold text-gray-800 dark:text-white'>New zone</p>
              <button onClick={cancelAdding} className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>

            <div className='relative'>
              <label className='block text-xs font-medium text-gray-500 mb-1'>Search suburb or address</label>
              <input value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); searchLocation(e.target.value) }}
                placeholder='e.g. Parramatta, Chatswood...'
                className='w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white' />
              {searching && <p className='text-xs text-gray-400 mt-1'>Searching...</p>}
              {searchResults.length > 0 && (
                <div className='absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 mt-1 max-h-40 overflow-y-auto'>
                  {searchResults.map((r, i) => (
                    <button key={i} onClick={() => selectLocation(r)}
                      className='w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0'>
                      {r.place_name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className='block text-xs font-medium text-gray-500 mb-1'>Zone name</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder='e.g. Depot, Job Site A'
                className='w-full h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white' />
            </div>

            <div>
              <div className='flex justify-between items-center mb-2'>
                <label className='text-xs font-medium text-gray-500'>Radius</label>
                <span className='text-sm font-bold text-blue-600'>{radiusLabel}</span>
              </div>
              <input type='range' min='100' max='20000' step='100'
                value={form.radiusMetres}
                onChange={e => setForm(f => ({ ...f, radiusMetres: parseInt(e.target.value) }))}
                className='w-full accent-blue-600' />
              <div className='flex justify-between text-xs text-gray-400 mt-1'>
                <span>100m</span><span>20km</span>
              </div>
            </div>

            <div className='bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2'>
              <p className='text-xs text-gray-500 mb-0.5'>Center point — drag blue pin on map to move</p>
              <p className='text-xs font-mono text-gray-700 dark:text-gray-300'>{center.lat}, {center.lng}</p>
            </div>

            {vehicles.length > 0 && (
              <div>
                <label className='block text-xs font-medium text-gray-500 mb-2'>
                  Apply to vehicles
                  <span className='ml-1 text-gray-400 font-normal'>
                    ({selectedVehicles.length === 0 ? 'All vehicles' : `${selectedVehicles.length} selected`})
                  </span>
                </label>
                <div className='space-y-1.5 max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2'>
                  <label className='flex items-center gap-2 cursor-pointer'>
                    <input type='checkbox'
                      checked={selectedVehicles.length === 0}
                      onChange={() => setSelectedVehicles([])}
                      className='w-3.5 h-3.5 accent-blue-600' />
                    <span className='text-xs text-gray-600 dark:text-gray-300 font-medium'>All vehicles</span>
                  </label>
                  {vehicles.map(v => (
                    <label key={v._id} className='flex items-center gap-2 cursor-pointer'>
                      <input type='checkbox'
                        checked={selectedVehicles.includes(v._id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedVehicles(s => [...s, v._id])
                          } else {
                            setSelectedVehicles(s => s.filter(id => id !== v._id))
                          }
                        }}
                        className='w-3.5 h-3.5 accent-blue-600' />
                      <span className='text-xs text-gray-600 dark:text-gray-300'>{v.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className='space-y-2'>
              {[
                { key: 'alertOnExit',  label: 'Alert when van exits zone' },
                { key: 'alertOnEntry', label: 'Alert when van enters zone' },
              ].map(a => (
                <label key={a.key} className='flex items-center gap-2 cursor-pointer'>
                  <input type='checkbox' checked={form[a.key]}
                    onChange={e => setForm(f => ({ ...f, [a.key]: e.target.checked }))}
                    className='w-4 h-4 accent-blue-600' />
                  <span className='text-xs text-gray-700 dark:text-gray-300'>{a.label}</span>
                </label>
              ))}
            </div>

            <div className='flex gap-2'>
              <button onClick={handleSave} disabled={saving || !form.name}
                className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition'>
                {saving ? 'Saving...' : 'Save zone'}
              </button>
              <button onClick={cancelAdding}
                className='h-9 px-3 border border-gray-200 text-gray-600 text-xs rounded-lg hover:bg-gray-50'>
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className='flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800'>
          {loading ? (
            <p className='text-sm text-gray-400 p-4'>Loading...</p>
          ) : zones.length === 0 && !adding ? (
            <div className='p-6 text-center'>
              <p className='text-2xl mb-2'>📍</p>
              <p className='text-sm text-gray-400 mb-1'>No zones yet</p>
              <p className='text-xs text-gray-300'>Click "+ New zone" to get started</p>
            </div>
          ) : zones.map((zone, i) => (
            <button key={i} onClick={() => setSelected(selected?._id === zone._id ? null : zone)}
              className={`w-full flex items-center justify-between px-4 py-3 text-left transition ${
                selected?._id === zone._id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}>
              <div>
                <p className='text-sm font-medium text-gray-800 dark:text-white'>{zone.name}</p>
                <div className='flex gap-2 mt-0.5'>
                  {zone.alertOnExit  && <span className='text-xs text-amber-600'>Exit alert</span>}
                  {zone.alertOnEntry && <span className='text-xs text-blue-600'>Entry alert</span>}
                  {zone.radiusMetres && (
                    <span className='text-xs text-gray-400'>
                      {zone.radiusMetres >= 1000 ? `${(zone.radiusMetres/1000).toFixed(1)}km` : `${zone.radiusMetres}m`}
                    </span>
                  )}
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${zone.active ? 'bg-teal-500' : 'bg-gray-300'}`} />
            </button>
          ))}
        </div>

        {selected && !adding && (
          <div className='border-t border-gray-200 dark:border-gray-800 p-4'>
            <div className='flex items-center justify-between mb-3'>
              <p className='text-sm font-semibold text-gray-800 dark:text-white'>{selected.name}</p>
              <button onClick={() => setSelected(null)} className='text-gray-400 hover:text-gray-600 text-lg leading-none'>×</button>
            </div>
            <div className='space-y-1.5 mb-3'>
              {selected.radiusMetres && <Row label='Radius' value={selected.radiusMetres >= 1000 ? `${(selected.radiusMetres/1000).toFixed(1)} km` : `${selected.radiusMetres} m`} />}
            <Row label='Exit alert'  value={selected.alertOnExit  ? 'Yes' : 'No'} />
            <Row label='Entry alert' value={selected.alertOnEntry ? 'Yes' : 'No'} />
            <Row label='Applies to' value={
              !selected.vehicleIds || selected.vehicleIds.length === 0
                ? 'All vehicles'
                : `${selected.vehicleIds.length} vehicle${selected.vehicleIds.length > 1 ? 's' : ''}`
            } />
            {selected.vehicleIds && selected.vehicleIds.length > 0 && (
              <div className='mt-1'>
                {vehicles.filter(v => selected.vehicleIds.includes(v._id)).map(v => (
                  <p key={v._id} className='text-xs text-blue-600 py-0.5'>• {v.name}</p>
                ))}
              </div>
            )}
            <Row label='Created' value={new Date(selected.createdAt).toLocaleDateString('en-AU')} />
            </div>
            <button onClick={() => handleDelete(selected._id)}
              className='w-full h-8 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg transition'>
              Delete zone
            </button>
          </div>
        )}
      </div>

      <div className='flex-1 relative'>
        <div ref={mapContainer} className='w-full h-full' />
        {adding && (
          <div className='absolute top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900 rounded-full px-4 py-2 shadow-lg text-xs text-gray-600 dark:text-gray-400 font-medium pointer-events-none whitespace-nowrap'>
            📍 Drag blue pin to move center · Use slider to resize
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className='flex justify-between py-1 border-b border-gray-100 dark:border-gray-800'>
      <span className='text-xs text-gray-500'>{label}</span>
      <span className='text-xs font-medium text-gray-800 dark:text-white'>{value}</span>
    </div>
  )
}