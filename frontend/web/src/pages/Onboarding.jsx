import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

const STEPS = ['Register Device', 'Name Vehicle', 'Business Hours', 'Alert Preferences']

export default function Onboarding() {
  const navigate            = useNavigate()
  const completeOnboarding  = useAuthStore(s => s.completeOnboarding)
  const [step, setStep]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const [imei, setImei]         = useState('')
  const [deviceType, setDeviceType] = useState('FMC920')
  const [vehicleName, setVehicleName] = useState('')
  const [rego, setRego]         = useState('')
  const [businessStart, setBusinessStart] = useState('07:00')
  const [businessEnd, setBusinessEnd]     = useState('18:00')
  const [businessDays, setBusinessDays]   = useState([1,2,3,4,5])
  const [alertSpeeding, setAlertSpeeding] = useState(true)
  const [alertHarsh, setAlertHarsh]       = useState(true)
  const [alertAfterHours, setAlertAfterHours] = useState(true)

  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

  function toggleDay(d) {
    setBusinessDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    )
  }

  async function handleNext() {
    setError('')
    setLoading(true)
    try {
      if (step === 0) {
        if (!/^\d{15}$/.test(imei)) {
          setError('IMEI must be exactly 15 digits')
          setLoading(false)
          return
        }
        await api.post('/api/imei/register', { imei, deviceType })
      }

      if (step === 1) {
        if (!vehicleName.trim()) {
          setError('Vehicle name is required')
          setLoading(false)
          return
        }
        await api.post('/api/vehicles', {
          name: vehicleName,
          registration: rego,
          imei,
          deviceType,
        })
      }

      if (step === 2) {
        await api.put('/api/fbt/settings', {
          businessHours: { start: businessStart, end: businessEnd },
          businessDays,
          mode: 'auto',
        })
      }

      if (step === 3) {
        await api.post('/api/alerts/preferences', {
          speeding:   alertSpeeding,
          harshDriving: alertHarsh,
          afterHours: alertAfterHours,
        })
        await api.put('/api/settings/onboarding-complete')
        completeOnboarding()
        navigate('/dashboard')
        return
      }

      setStep(s => s + 1)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleSkip() {
    if (step === 3) {
      api.put('/api/settings/onboarding-complete').catch(() => {})
      completeOnboarding()
      navigate('/dashboard')
      return
    }
    setStep(s => s + 1)
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>

        <div style={styles.header}>
          <h1 style={styles.logo}>Clarity Fleet</h1>
          <p style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</p>
        </div>

        <div style={styles.progressBar}>
          <div style={{ ...styles.progressFill, width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>

        <div style={styles.stepTabs}>
          {STEPS.map((s, i) => (
            <span key={i} style={{
              ...styles.tab,
              color: i === step ? '#3b82f6' : i < step ? '#4ade80' : '#4b5563'
            }}>
              {i < step ? '✓' : i + 1}. {s}
            </span>
          ))}
        </div>

        {step === 0 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Register your first device</h2>
            <p style={styles.stepSub}>Find the IMEI on the device label or read it with Teltonika Configurator app</p>
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
                autoFocus
              />
              <span style={styles.hint}>{imei.length}/15 digits</span>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Device Type</label>
              <select style={styles.input} value={deviceType} onChange={e => setDeviceType(e.target.value)}>
                <option value="FMC920">FMC920 — Hardwired</option>
                <option value="FMC003">FMC003 — OBD Plug-in</option>
                <option value="FMC650">FMC650 — Professional</option>
              </select>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Name your vehicle</h2>
            <p style={styles.stepSub}>Give it a name your team will recognise</p>
            <div style={styles.field}>
              <label style={styles.label}>Vehicle Name</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. Van 1 — John's HiAce"
                value={vehicleName}
                onChange={e => setVehicleName(e.target.value)}
                autoFocus
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Registration Plate (optional)</label>
              <input
                style={styles.input}
                type="text"
                placeholder="e.g. ABC123"
                value={rego}
                onChange={e => setRego(e.target.value.toUpperCase())}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Set business hours</h2>
            <p style={styles.stepSub}>Trips inside these hours are automatically marked business. Outside is personal.</p>
            <div style={styles.row}>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>Start Time</label>
                <input
                  style={styles.input}
                  type="time"
                  value={businessStart}
                  onChange={e => setBusinessStart(e.target.value)}
                />
              </div>
              <div style={{ ...styles.field, flex: 1 }}>
                <label style={styles.label}>End Time</label>
                <input
                  style={styles.input}
                  type="time"
                  value={businessEnd}
                  onChange={e => setBusinessEnd(e.target.value)}
                />
              </div>
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Business Days</label>
              <div style={styles.dayRow}>
                {DAY_LABELS.map((d, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleDay(i)}
                    style={{
                      ...styles.dayBtn,
                      background: businessDays.includes(i) ? '#3b82f6' : '#0f1117',
                      color:      businessDays.includes(i) ? '#fff' : '#6b7280',
                      border:     businessDays.includes(i) ? '1px solid #3b82f6' : '1px solid #2a2d3a',
                    }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={styles.stepContent}>
            <h2 style={styles.stepTitle}>Alert preferences</h2>
            <p style={styles.stepSub}>Choose what you want to be notified about. You can change these anytime.</p>
            {[
              { label: 'Speeding alerts',        value: alertSpeeding,   set: setAlertSpeeding },
              { label: 'Harsh driving alerts',   value: alertHarsh,      set: setAlertHarsh },
              { label: 'After-hours movement',   value: alertAfterHours, set: setAlertAfterHours },
            ].map(({ label, value, set }) => (
              <div key={label} style={styles.toggleRow}>
                <span style={styles.toggleLabel}>{label}</span>
                <button
                  type="button"
                  onClick={() => set(v => !v)}
                  style={{
                    ...styles.toggle,
                    background: value ? '#3b82f6' : '#2a2d3a',
                  }}
                >
                  <span style={{
                    ...styles.toggleKnob,
                    transform: value ? 'translateX(20px)' : 'translateX(2px)',
                  }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={handleNext} disabled={loading}>
            {loading ? 'Saving...' : step === 3 ? 'Finish Setup' : 'Continue'}
          </button>
          <button style={styles.skipBtn} onClick={handleSkip}>
            {step === 3 ? 'Skip and go to dashboard' : 'Skip this step'}
          </button>
        </div>

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '40px',
    width: '100%',
    maxWidth: '520px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  logo: {
    color: '#3b82f6',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0,
  },
  stepLabel: {
    color: '#6b7280',
    fontSize: '13px',
    margin: 0,
  },
  progressBar: {
    height: '4px',
    background: '#2a2d3a',
    borderRadius: '2px',
    marginBottom: '20px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
  },
  stepTabs: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    marginBottom: '28px',
  },
  tab: {
    fontSize: '12px',
    fontWeight: '500',
  },
  stepContent: {
    marginBottom: '24px',
  },
  stepTitle: {
    color: '#111827',
    fontSize: '20px',
    fontWeight: '600',
    margin: '0 0 6px 0',
  },
  stepSub: {
    color: '#6b7280',
    fontSize: '14px',
    margin: '0 0 24px 0',
    lineHeight: '1.5',
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
    padding: '10px 14px',
    background: '#ffffff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    color: '#111827',
    fontSize: '14px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  hint: {
    color: '#4b5563',
    fontSize: '11px',
    marginTop: '4px',
    display: 'block',
  },
  row: {
    display: 'flex',
    gap: '12px',
  },
  dayRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  dayBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 0',
    borderBottom: '1px solid #2a2d3a',
  },
  toggleLabel: {
    color: '#d1d5db',
    fontSize: '14px',
  },
  toggle: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
  },
  toggleKnob: {
    position: 'absolute',
    top: '3px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: '#fff',
    transition: 'transform 0.2s',
  },
  actions: {
    marginTop: '8px',
  },
  primaryBtn: {
    width: '100%',
    padding: '12px',
    background: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  skipBtn: {
    width: '100%',
    padding: '10px',
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
}