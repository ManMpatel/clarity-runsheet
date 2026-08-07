import { useEffect, useState } from 'react'
import { useAlertStore } from '../store/alertStore'
import api from '../lib/api'

const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  warning:  'bg-amber-100 text-amber-700 border-amber-200',
  info:     'bg-blue-100 text-blue-700 border-blue-200',
}

const TYPE_LABELS = {
  afterHours:     'After Hours',
  speeding:       'Speeding',
  engineFault:    'Engine Fault',
  lowBattery:     'Low Battery',
  geofenceBreach: 'Geofence Breach',
  towing:         'Towing Detected',
  crash:          'Crash Detected',
}

export default function Alerts() {
  const { alerts, unreadCount, setAlerts, markRead, markAllRead } = useAlertStore()
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/alerts?limit=50')
        setAlerts(res.data.alerts, res.data.unread)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleMarkRead(id) {
    try {
      await api.put(`/alerts/${id}/read`)
      markRead(id)
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.put('/alerts/read-all')
      markAllRead()
    } catch (err) {
      console.error(err.message)
    }
  }

  const filtered = alerts.filter(a => {
    if (filter === 'all')      return true
    if (filter === 'unread')   return !a.read
    if (filter === 'critical') return a.severity === 'critical'
    return a.type === filter
  })

  return (
    <div className='p-6'>

      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Alerts</h1>
          <p className='text-sm text-gray-500 mt-1'>
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className='text-sm text-blue-600 hover:underline'
          >
            Mark all read
          </button>
        )}
      </div>

      <div className='flex gap-2 mb-5 flex-wrap'>
        {['all', 'unread', 'critical', 'speeding', 'geofenceBreach', 'engineFault'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`h-8 px-3 rounded-full text-xs font-medium transition ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f === 'unread' ? 'Unread' : TYPE_LABELS[f] || f}
          </button>
        ))}
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading alerts...</p>
      ) : filtered.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-400'>No alerts found</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {filtered.map((alert, i) => (
            <div
              key={i}
              className={`bg-white rounded-xl border p-4 flex items-start gap-4 transition ${
                !alert.read ? 'border-blue-200' : 'border-gray-200'
              }`}
            >
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${
                SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.info
              }`}>
                {alert.severity}
              </span>
              <div className='flex-1 min-w-0'>
                <p className='text-sm font-medium text-gray-800'>
                  {TYPE_LABELS[alert.type] || alert.type}
                </p>
                <p className='text-sm text-gray-600 mt-0.5'>{alert.message}</p>
                <p className='text-xs text-gray-400 mt-1'>
                  {new Date(alert.createdAt).toLocaleString('en-AU', {
                    day: '2-digit', month: 'short',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
              {!alert.read && (
                <button
                  onClick={() => handleMarkRead(alert.id)}
                  className='text-xs text-blue-600 hover:underline flex-shrink-0'
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  )
}