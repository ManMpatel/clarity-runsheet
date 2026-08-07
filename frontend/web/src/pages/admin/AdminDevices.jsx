import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')

  useEffect(() => {
    api.get('/admin/devices')
      .then(res => setDevices(res.data))
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = devices.filter(d =>
    d.imei?.toLowerCase().includes(search.toLowerCase()) ||
    d.registeredByCompanyId?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>IMEI Overview</h1>
          <p className='text-sm text-gray-500 mt-1'>{devices.length} total devices</p>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search IMEI...'
          className='h-9 px-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-56'
        />
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <p className='text-sm text-gray-400 p-6'>Loading...</p>
        ) : filtered.length === 0 ? (
          <p className='text-sm text-gray-400 p-6'>No devices found</p>
        ) : (
          <div className='divide-y divide-gray-100'>
            {filtered.map((d, i) => (
              <div key={i} className='flex items-center justify-between px-5 py-3'>
                <div>
                  <p className='text-sm font-mono font-medium text-gray-800'>{d.imei}</p>
                  <p className='text-xs text-gray-400 mt-0.5'>
                    {d.deviceType || 'FMC920'} — registered by {d.registeredByCompanyId || 'unknown'}
                  </p>
                  {d.registeredAt && (
                    <p className='text-xs text-gray-300'>
                      {new Date(d.registeredAt).toLocaleDateString('en-AU')}
                    </p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  d.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {d.status || 'registered'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}