import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import api from '../../lib/api'

const DEVICE_TYPES = ['FMC920', 'FMC003', 'FMC650']

export default function RegisterDevice() {
  const [searchParams]        = useSearchParams()
  const navigate              = useNavigate()
  const [imei, setImei]       = useState(searchParams.get('imei') || '')
  const [deviceType, setDeviceType] = useState('FMC920')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!/^\d{15}$/.test(imei)) {
      setError('IMEI must be exactly 15 digits')
      return
    }

    setLoading(true)
    try {
      await api.post('/imei/register', { imei, deviceType, notes })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h2 style={styles.successTitle}>Device Registered</h2>
          <p style={styles.successText}>
            IMEI <strong>{imei}</strong> is now locked to your account.
            Commission will be applied once the customer activates their subscription.
          </p>
          <button
            style={styles.button}
            onClick={() => navigate('/garage/imei-check')}
          >
            Check Another Device
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => navigate('/garage/my-devices')}
          >
            View My Registered Devices
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register Device</h2>
        <p style={styles.subtitle}>
          Register before installation to lock commission to your account
        </p>

        <form onSubmit={handleSubmit}>
          <div style={styles.field}>
            <label style={styles.label}>IMEI Number</label>
            <input
              style={styles.input}
              type="text"
              inputMode="numeric"
              maxLength={15}
              placeholder="15-digit IMEI"
              value={imei}
              onChange={e => setImei(e.target.value.replace(/\D/g, ''))}
              required
            />
            <span style={styles.fieldHint}>{imei.length}/15 digits</span>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Device Type</label>
            <select
              style={styles.input}
              value={deviceType}
              onChange={e => setDeviceType(e.target.value)}
            >
              {DEVICE_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Notes (optional)</label>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. white hiace, rego ABC123"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button
            style={{
              ...styles.button,
              opacity: imei.length !== 15 ? 0.5 : 1,
            }}
            type="submit"
            disabled={loading || imei.length !== 15}
          >
            {loading ? 'Registering...' : 'Register Device'}
          </button>

          <button
            style={styles.secondaryButton}
            type="button"
            onClick={() => navigate('/garage/imei-check')}
          >
            Back
          </button>
        </form>
      </div>
    </div>
  )
}

const styles = {
  page: {
    padding: '32px 24px',
    maxWidth: '520px',
    margin: '0 auto',
  },
  card: {
    background: '#1a1d27',
    border: '1px solid #2a2d3a',
    borderRadius: '12px',
    padding: '32px',
  },
  title: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 6px 0',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0 0 28px 0',
  },
  field: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    color: '#9ca3af',
    fontSize: '13px',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    background: '#0f1117',
    border: '1px solid #2a2d3a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  fieldHint: {
    color: '#4b5563',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
  },
  button: {
    width: '100%',
    padding: '11px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '8px',
  },
  secondaryButton: {
    width: '100%',
    padding: '11px',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    marginBottom: '8px',
  },
  successIcon: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#052e16',
    border: '1px solid #166534',
    color: '#4ade80',
    fontSize: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
  successTitle: {
    color: '#ffffff',
    fontSize: '20px',
    fontWeight: '600',
    textAlign: 'center',
    margin: '0 0 12px 0',
  },
  successText: {
    color: '#9ca3af',
    fontSize: '14px',
    textAlign: 'center',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
}