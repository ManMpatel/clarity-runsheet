import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function IMEICheck() {
  const [imei, setImei]     = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  async function handleCheck() {
    setError('')
    setResult(null)

    if (!/^\d{15}$/.test(imei)) {
      setError('IMEI must be exactly 15 digits')
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`${API}/api/imei/check`, {
        params: { imei },
        headers: { Authorization: `Bearer ${token}` },
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Check failed')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleCheck()
  }

  function getResultStyle(status) {
    if (status === 'unregistered')      return styles.resultGreen
    if (status === 'registered_to_you') return styles.resultBlue
    if (status === 'registered_to_other') return styles.resultRed
    return {}
  }

  function getIcon(status) {
    if (status === 'unregistered')        return '✓'
    if (status === 'registered_to_you')   return 'ℹ'
    if (status === 'registered_to_other') return '✕'
    return ''
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>IMEI Pre-Check</h2>
        <p style={styles.subtitle}>
          Check if a device is available before installation
        </p>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            inputMode="numeric"
            maxLength={15}
            placeholder="Enter 15-digit IMEI"
            value={imei}
            onChange={e => setImei(e.target.value.replace(/\D/g, ''))}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button
            style={styles.button}
            onClick={handleCheck}
            disabled={loading || imei.length !== 15}
          >
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>

        <p style={styles.hint}>
          {imei.length}/15 digits
          {imei.length === 15 && ' — ready to check'}
        </p>

        {error && (
          <div style={styles.resultRed}>
            <span style={styles.icon}>✕</span>
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div style={getResultStyle(result.status)}>
            <span style={styles.icon}>{getIcon(result.status)}</span>
            <div>
              <p style={styles.resultMessage}>{result.message}</p>
              {result.registeredAt && (
                <p style={styles.resultSub}>
                  Registered on {new Date(result.registeredAt).toLocaleDateString('en-AU')}
                </p>
              )}
            </div>
          </div>
        )}

        {result?.status === 'unregistered' && (
          <button
            style={styles.registerButton}
            onClick={() => window.location.href = `/garage/register-device?imei=${imei}`}
          >
            Register this device →
          </button>
        )}
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
    margin: '0 0 24px 0',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: '#0f1117',
    border: '1px solid #2a2d3a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '16px',
    letterSpacing: '0.1em',
    outline: 'none',
  },
  button: {
    padding: '10px 20px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  hint: {
    color: '#4b5563',
    fontSize: '12px',
    margin: '8px 0 20px 0',
  },
  resultGreen: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: '#052e16',
    border: '1px solid #166534',
    borderRadius: '8px',
    color: '#4ade80',
  },
  resultBlue: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: '#0c1a2e',
    border: '1px solid #1e40af',
    borderRadius: '8px',
    color: '#60a5fa',
  },
  resultRed: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '16px',
    background: '#2d0a0a',
    border: '1px solid #991b1b',
    borderRadius: '8px',
    color: '#f87171',
  },
  icon: {
    fontSize: '18px',
    fontWeight: '700',
    lineHeight: 1,
    marginTop: '1px',
  },
  resultMessage: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: '500',
  },
  resultSub: {
    margin: 0,
    fontSize: '12px',
    opacity: 0.7,
  },
  registerButton: {
    width: '100%',
    padding: '11px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '16px',
  },
}