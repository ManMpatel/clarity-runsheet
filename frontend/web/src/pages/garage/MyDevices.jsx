import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/api'

const STATUS_COLORS = {
  pending:  { bg: '#1c1a00', border: '#854d0e', color: '#facc15' },
  active:   { bg: '#052e16', border: '#166534', color: '#4ade80' },
  cancelled:{ bg: '#2d0a0a', border: '#991b1b', color: '#f87171' },
}

export default function MyDevices() {
  const navigate        = useNavigate()
  const [devices, setDevices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/imei/my-devices')
        setDevices(res.data)
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load devices')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <div style={styles.page}><p style={styles.hint}>Loading...</p></div>
  if (error)   return <div style={styles.page}><p style={styles.error}>{error}</p></div>

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>My Registered Devices</h2>
          <p style={styles.subtitle}>{devices.length} device{devices.length !== 1 ? 's' : ''} registered to your account</p>
        </div>
        <button style={styles.button} onClick={() => navigate('/garage/imei-check')}>
          + Register Device
        </button>
      </div>

      {devices.length === 0 && (
        <div style={styles.empty}>
          <p style={styles.emptyText}>No devices registered yet</p>
          <p style={styles.hint}>Register a device before installation to lock commission to your account</p>
          <button style={styles.button} onClick={() => navigate('/garage/imei-check')}>
            Register First Device
          </button>
        </div>
      )}

      <div style={styles.list}>
        {devices.map(device => {
          const s = STATUS_COLORS[device.subscriptionStatus] || STATUS_COLORS.pending
          return (
            <div key={device.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <p style={styles.imei}>{device.imei}</p>
                  <p style={styles.deviceType}>{device.deviceType}</p>
                </div>
                <span style={{
                  ...styles.badge,
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  color: s.color,
                }}>
                  {device.subscriptionStatus}
                </span>
              </div>

              {device.notes && (
                <p style={styles.notes}>{device.notes}</p>
              )}

              <div style={styles.cardBottom}>
                <p style={styles.hint}>
                  Registered {new Date(device.registeredAt).toLocaleDateString('en-AU')}
                </p>
                {device.customerId
                  ? <p style={styles.linked}>Customer linked</p>
                  : <p style={styles.unlinked}>Awaiting customer</p>
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: '32px 24px',
    maxWidth: '700px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    color: '#111827',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 4px 0',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
    margin: 0,
  },
  button: {
    padding: '9px 16px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  imei: {
    color: '#111827',
    fontSize: '15px',
    fontWeight: '600',
    margin: '0 0 2px 0',
    fontFamily: 'monospace',
    letterSpacing: '0.05em',
  },
  deviceType: {
    color: '#6b7280',
    fontSize: '12px',
    margin: 0,
  },
  badge: {
    padding: '3px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  notes: {
    color: '#6b7280',
    fontSize: '13px',
    margin: '0 0 8px 0',
    fontStyle: 'italic',
  },
  cardBottom: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #f3f4f6',
  },
  hint: {
    color: '#9ca3af',
    fontSize: '12px',
    margin: 0,
  },
  linked: {
    color: '#4ade80',
    fontSize: '12px',
    margin: 0,
    fontWeight: '500',
  },
  unlinked: {
    color: '#f59e0b',
    fontSize: '12px',
    margin: 0,
    fontWeight: '500',
  },
  empty: {
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '40px',
    textAlign: 'center',
  },
  emptyText: {
    color: '#111827',
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  error: {
    color: '#f87171',
    fontSize: '14px',
  },
}