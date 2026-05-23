import { useEffect, useRef, useState } from 'react'
import api from '../lib/api'

export default function GeofenceManager() {
  const mapContainer = useRef(null)
  const map          = useRef(null)
  const draw         = useRef(null)
  const [zones, setZones]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState(null)
  const [mapCenter, setMapCenter] = useState({ lng: 151.2093, lat: -33.8688 })
  const [form, setForm] = useState({
    name: '', alertOnExit: true, alertOnEntry: false, radiusMetres: 200
  })
  const [mapCenter, setMapCenter] = useState({ lng: 151.2093, lat: -33.8688 })
  

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/geofences')
        setZones(res.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
    initMap()
  }, [])

  useEffect(() => {
    if (!map.current || !showAdd) {
      if (map.current?.getSource('preview-zone')) {
        map.current.getSource('preview-zone').setData({ type: 'FeatureCollection', features: [] })
      }
      return
    }
    const source = map.current.getSource('preview-zone')
    if (!source) return
    const polygon = generateCirclePolygon(mapCenter.lng, mapCenter.lat, form.radiusMetres)
    source.setData({ type: 'Feature', geometry: polygon })
  }, [form.radiusMetres, mapCenter, showAdd])

  async function initMap() {
    const mapboxgl = (await import('mapbox-gl')).default
    await import('mapbox-gl/dist/mapbox-gl.css')
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style:     'mapbox://styles/mapbox/streets-v12',
      center:    [151.2093, -33.8688],
      zoom:      11,
    })

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('move', () => {
      const c = map.current.getCenter()
      setMapCenter({ lng: parseFloat(c.lng.toFixed(6)), lat: parseFloat(c.lat.toFixed(6)) })
    })

    function addPreviewLayers() {
      if (map.current.getSource('preview-zone')) return
      map.current.addSource('preview-zone', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      })
      map.current.addLayer({
        id: 'preview-zone-fill',
        type: 'fill',
        source: 'preview-zone',
        paint: { 'fill-color': '#3b82f6', 'fill-opacity': 0.15 }
      })
      map.current.addLayer({
        id: 'preview-zone-line',
        type: 'line',
        source: 'preview-zone',
        paint: { 'line-color': '#3b82f6', 'line-width': 2, 'line-dasharray': [2, 1] }
      })
    }

    if (map.current.loaded()) {
      addPreviewLayers()
    } else {
      map.current.on('load', addPreviewLayers)
    }
  }

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

  async function handleSave() {
    if (!form.name) return
    try {
      const centre = map.current.getCenter()
      const geometry = generateCirclePolygon(centre.lng, centre.lat, form.radiusMetres)
      const res = await api.post('/api/geofences', {
        ...form, geometry, centre: { lng: centre.lng, lat: centre.lat }
      })
      setZones(z => [res.data, ...z])
      setShowAdd(false)
      setForm({ name: '', alertOnExit: true, alertOnEntry: false })
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/geofences/${id}`)
      setZones(z => z.filter(zone => zone._id !== id))
      setSelected(null)
    } catch (err) {
      console.error(err.message)
    }
  }

  return (
    <div className='flex h-[calc(100vh-60px)] md:h-screen'>

      <div className='hidden md:flex flex-col w-72 bg-white border-r border-gray-200'>
        <div className='p-4 border-b border-gray-200 flex items-center justify-between'>
          <h2 className='text-sm font-semibold text-gray-700'>Zones</h2>
          <button
            onClick={() => setShowAdd(true)}
            className='text-xs px-3 h-7 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition'
          >
            + Add
          </button>
        </div>

        <div className='flex-1 overflow-y-auto divide-y divide-gray-100'>
          {loading ? (
            <p className='text-sm text-gray-400 p-4'>Loading...</p>
          ) : zones.length === 0 ? (
            <p className='text-sm text-gray-400 p-4'>No zones yet</p>
          ) : (
            zones.map((zone, i) => (
              <button
                key={i}
                onClick={() => setSelected(zone)}
                className='w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition'
              >
                <div>
                  <p className='text-sm font-medium text-gray-800'>{zone.name}</p>
                  <div className='flex gap-2 mt-1'>
                    {zone.alertOnExit && (
                      <span className='text-xs text-amber-600'>Exit alert</span>
                    )}
                    {zone.alertOnEntry && (
                      <span className='text-xs text-blue-600'>Entry alert</span>
                    )}
                  </div>
                </div>
                <span className={`w-2 h-2 rounded-full ${
                  zone.active ? 'bg-teal-500' : 'bg-gray-300'
                }`} />
              </button>
            ))
          )}
        </div>
      </div>

      <div className='flex-1 relative'>
        <div ref={mapContainer} className='w-full h-full' />

        <button
          onClick={() => setShowAdd(true)}
          className='md:hidden absolute top-4 right-4 z-10 h-9 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg shadow'
        >
          + Add zone
        </button>
      </div>

      {showAdd && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base font-semibold text-gray-800'>New geofence zone</h3>
              <button onClick={() => setShowAdd(false)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>
            <div className='space-y-3'>
               <p className='text-xs text-gray-500 mb-1'>Pan the map to centre on your zone location. Blue circle shows the zone.</p>
              <div className='bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-500 font-mono'>
                Centre: {mapCenter.lat}, {mapCenter.lng}
              </div>
              <input
                placeholder='Zone name'
                value={form.name}
                onChange={e => setForm(f =>({ ...f, name: e.target.value }))}
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <div>
                <label className='block text-xs text-gray-500 mb-1'>Radius (metres)</label>
                <input
                  type='number'
                  min='50'
                  max='50000'
                  value={form.radiusMetres}
                  onChange={e => setForm(f => ({ ...f, radiusMetres: parseInt(e.target.value) || 200 }))}
                  className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
                <p className='text-xs text-gray-400 mt-1'>
                  {form.radiusMetres
                    ? form.radiusMetres >= 1000
                      ? `${(form.radiusMetres / 1000).toFixed(1)} km radius`
                      : `${form.radiusMetres} metres radius`
                    : 'Enter a radius'}
                </p>
              </div>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.alertOnExit}
                  onChange={e => setForm(f => ({ ...f, alertOnExit: e.target.checked }))}
                  className='w-4 h-4 accent-blue-600'
                />
                <span className='text-sm text-gray-700'>Alert when van exits zone</span>
              </label>
              <label className='flex items-center gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={form.alertOnEntry}
                  onChange={e => setForm(f => ({ ...f, alertOnEntry: e.target.checked }))}
                  className='w-4 h-4 accent-blue-600'
                />
                <span className='text-sm text-gray-700'>Alert when van enters zone</span>
              </label>
            </div>
            <div className='flex gap-3 mt-5'>
              <button
                onClick={handleSave}
                className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'
              >
                Save zone
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base font-semibold text-gray-800'>{selected.name}</h3>
              <button onClick={() => setSelected(null)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>
            <div className='space-y-2'>
              {selected.radiusMetres && (
                <DetailRow label='Radius' value={
                  selected.radiusMetres >= 1000
                    ? `${(selected.radiusMetres / 1000).toFixed(1)} km`
                    : `${selected.radiusMetres} m`
                } />
              )}
              <DetailRow label='Exit alert'  value={selected.alertOnExit  ? 'Yes' : 'No'} />
              <DetailRow label='Entry alert' value={selected.alertOnEntry ? 'Yes' : 'No'} />
              <DetailRow label='Status'      value={selected.active ? 'Active' : 'Inactive'} />
              <DetailRow label='Created' value={
                new Date(selected.createdAt).toLocaleDateString('en-AU')
              } />
            </div>
            <div className='flex gap-3 mt-5'>
              <button
                onClick={() => handleDelete(selected._id)}
                className='flex-1 h-9 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition'
              >
                Delete zone
              </button>
              <button
                onClick={() => setSelected(null)}
                className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
              >
                Close
              </button>
            </div>
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