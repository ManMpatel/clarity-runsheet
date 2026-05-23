import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminDevices() {
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/admin/devices')
        setDevices(res.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className='text-sm text-gray-500 p-6'>Loading devices...</p>

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-900 mb-2'>IMEI Overview</h1>
      <p className='text-sm text-gray-500 mb-6'>{devices.length} registered devices</p>

      {devices.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-500'>No devices registered yet</p>
        </div>
      ) : (
        <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-gray-200 bg-gray-50'>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-600'>IMEI</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-600'>Type</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-600'>Status</th>
                <th className='text-left px-4 py-3 text-xs font-semibold text-gray-600'>Registered</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100'>
              {devices.map((d, i) => (
                <tr key={i}>
                  <td className='px-4 py-3 font-mono text-xs text-gray-800'>{d.imei}</td>
                  <td className='px-4 py-3 text-xs text-gray-600'>{d.deviceType}</td>
                  <td className='px-4 py-3'>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      d.subscriptionStatus === 'active'   ? 'bg-green-100 text-green-700'  :
                      d.subscriptionStatus === 'cancelled' ? 'bg-red-100 text-red-700'     :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {d.subscriptionStatus}
                    </span>
                  </td>
                  <td className='px-4 py-3 text-xs text-gray-500'>
                    {new Date(d.registeredAt).toLocaleDateString('en-AU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

