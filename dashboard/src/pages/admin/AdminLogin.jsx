import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export default function AdminLogin() {
  const [step, setStep]       = useState('password')
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode]       = useState('')
  const [tempToken, setTempToken] = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/admin/auth/login`, { email, password })
      setTempToken(res.data.tempToken)
      setStep('totp')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotpSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API}/api/admin/auth/verify-totp`, {
        tempToken,
        code,
      })
      localStorage.setItem('adminToken', res.data.token)
      window.location.href = '/admin/dashboard'
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid code')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>Clarity Fleet</h2>
        <p style={styles.subtitle}>Super Admin</p>

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Email</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotpSubmit}>
            <p style={styles.hint}>Enter the 6-digit code from Google Authenticator</p>
            <div style={styles.field}>
              <label style={styles.label}>Authenticator Code</label>
              <input
                style={{ ...styles.input, letterSpacing: '0.3em', textAlign: 'center' }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                required
                autoFocus
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.button} type="submit" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button style={styles.back} type="button" onClick={() => { setStep('password'); setError('') }}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f1117',
  },
  card: {
    background: '#1a1d27',
    border: '1px solid #2a2d3a',
    borderRadius: '12px',
    padding: '40px',
    width: '100%',
    maxWidth: '380px',
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '700',
    margin: '0 0 4px 0',
    textAlign: 'center',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '13px',
    textAlign: 'center',
    margin: '0 0 32px 0',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    color: '#9ca3af',
    fontSize: '13px',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    background: '#0f1117',
    border: '1px solid #2a2d3a',
    borderRadius: '8px',
    color: '#ffffff',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
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
  back: {
    width: '100%',
    padding: '11px',
    background: 'transparent',
    color: '#6b7280',
    border: 'none',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '8px',
  },
  hint: {
    color: '#9ca3af',
    fontSize: '13px',
    marginBottom: '20px',
    textAlign: 'center',
  },
  error: {
    color: '#ef4444',
    fontSize: '13px',
    marginBottom: '8px',
  },
}