import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFleetStore } from '../store/fleetStore'
import { useAlertStore } from '../store/alertStore'
import api from '../lib/api'

export default function Dashboard() {
  const [loading, setLoading]   = useState(true)
  const [stats, setStats]       = useState(null)
  const navigate                = useNavigate()
  const setFleet                  = useFleetStore(s => s.setFleet)
  const getAllVans                 = useFleetStore(s => s.getAllVans)
  const { alerts, unreadCount }   = useAlertStore()

  useEffect(() => {
    async function load() {
      try {
        const [fleetRes, alertRes] = await Promise.all([
          api.get('/api/telemetry/live'),
          api.get('/api/alerts?limit=5'),
        ])
        setFleet(fleetRes.data)
        useAlertStore.getState().setAlerts(
          alertRes.data.alerts,
          alertRes.data.unread
        )
        buildStats(fleetRes.data)
      } catch (err) {
        console.error('Dashboard load error:', err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function buildStats(fleet) {
    const vans    = fleet.map(f => f.state).filter(Boolean)
    const moving  = vans.filter(v => v.speed > 0).length
    const idle    = vans.filter(v => v.speed === 0 && v.ignition).length
    const stopped = vans.filter(v => !v.ignition).length
    setStats({ total: fleet.length, moving, idle, stopped })
  }

  const vans = getAllVans()

  const isLocked = !stats && !loading

if (isLocked) {
  return (
    <div className='flex flex-col items-center justify-center h-[60vh] px-4 text-center'>
      <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-2xl'>
        🔒
      </div>
      <h2 className='text-xl font-bold text-gray-800 mb-2'>
        Your account is pending activation
      </h2>
      <p className='text-sm text-gray-500 max-w-sm mb-6'>
        Choose a plan to activate your fleet tracking. We will contact you to confirm payment and activate your account within 24 hours.
      </p>
      <button
        onClick={() => navigate('/billing')}
        className='h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'
      >
        View plans and pricing
      </button>
    </div>
  )
}

  if (loading) {
    return (
      <div className='flex items-center justify-center h-64'>
        <p className='text-sm text-gray-400'>Loading fleet data...</p>
      </div>
    )
  }

  return (
    <div className='p-6 space-y-6'>

      <div>
        <h1 className='text-2xl font-bold text-gray-900'>Dashboard</h1>
        <p className='text-sm text-gray-500 mt-1'>
          {new Date().toLocaleDateString('en-AU', {
            weekday: 'long', year: 'numeric',
            month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <StatCard label='Total Vans'  value={stats?.total   ?? 0} color='blue' />
        <StatCard label='Moving'      value={stats?.moving  ?? 0} color='teal' />
        <StatCard label='Idle'        value={stats?.idle    ?? 0} color='amber' />
        <StatCard label='Stopped'     value={stats?.stopped ?? 0} color='gray' />
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>

        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-sm font-semibold text-gray-700'>Recent Alerts</h2>
            <button
              onClick={() => navigate('/alerts')}
              className='text-xs text-blue-600 hover:underline'
            >
              View all
            </button>
          </div>
          {alerts.length === 0 ? (
            <p className='text-sm text-gray-400'>No recent alerts</p>
          ) : (
            <div className='space-y-3'>
              {alerts.slice(0, 5).map((alert, i) => (
                <AlertRow key={i} alert={alert} />
              ))}
            </div>
          )}
        </div>

        <div className='bg-white rounded-xl border border-gray-200 p-5'>
          <div className='flex items-center justify-between mb-4'>
            <h2 className='text-sm font-semibold text-gray-700'>Fleet Status</h2>
            <button
              onClick={() => navigate('/live-map')}
              className='text-xs text-blue-600 hover:underline'
            >
              Live map
            </button>
          </div>
          {vans.length === 0 ? (
            <p className='text-sm text-gray-400'>No vans registered</p>
          ) : (
            <div className='space-y-2'>
              {vans.slice(0, 8).map((van, i) => (
                <VanRow key={i} van={van} />
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  )
}

function StatCard({ label, value, color }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-600',
    teal:  'bg-teal-50 text-teal-600',
    amber: 'bg-amber-50 text-amber-600',
    gray:  'bg-gray-50 text-gray-600',
  }
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-5'>
      <p className='text-xs font-medium text-gray-500 mb-1'>{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  )
}

function AlertRow({ alert }) {
  const colors = {
    critical: 'bg-red-100 text-red-700',
    warning:  'bg-amber-100 text-amber-700',
    info:     'bg-blue-100 text-blue-700',
  }
  return (
    <div className='flex items-start gap-3'>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors[alert.severity] || colors.info}`}>
        {alert.severity}
      </span>
      <div className='flex-1 min-w-0'>
        <p className='text-sm text-gray-700 truncate'>{alert.message}</p>
        <p className='text-xs text-gray-400'>
          {new Date(alert.createdAt).toLocaleTimeString('en-AU')}
        </p>
      </div>
    </div>
  )
}

function VanRow({ van }) {
  const isMoving  = van.speed > 0
  const isIdle    = van.speed === 0 && van.ignition
  const isStopped = !van.ignition

  const status = isMoving ? 'Moving' : isIdle ? 'Idle' : 'Stopped'
  const dot    = isMoving
    ? 'bg-teal-500'
    : isIdle
    ? 'bg-amber-500'
    : 'bg-gray-400'

  return (
    <div className='flex items-center justify-between py-1.5'>
      <div className='flex items-center gap-2'>
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className='text-sm text-gray-700 font-medium'>
          {van.name || van.imei}
        </span>
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-xs text-gray-400'>{van.speed ?? 0} km/h</span>
        <span className='text-xs text-gray-500'>{status}</span>
      </div>
    </div>
  )
}