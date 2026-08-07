import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AlertsSection() {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [form, setForm] = useState({
    speeding:         true,
    afterHours:       true,
    speedLimit:       110,
    voltageThreshold: 11.5,
    smsNumber:        '',
  })

  useEffect(() => {
    api.get('/api/alerts/preferences').then(res => {
      const r = res.data
      const s = r.find(x => x.type === 'speeding')
      const a = r.find(x => x.type === 'afterHours')
      const b = r.find(x => x.type === 'lowBattery')
      if (s || a || b) {
        setForm({
          speeding:         s?.active ?? true,
          afterHours:       a?.active ?? true,
          speedLimit:       s?.speedLimit || 110,
          voltageThreshold: b?.voltageThreshold || 11.5,
          smsNumber:        s?.smsNumber || '',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await api.post('/api/alerts/preferences', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleRow = (key, label, desc) => (
    <div key={key} className='flex items-center justify-between px-5 py-4'>
      <div>
        <p className='text-sm font-medium text-gray-800 dark:text-white'>{label}</p>
        <p className='text-xs text-gray-400 mt-0.5'>{desc}</p>
      </div>
      <button
        onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
        className={`w-11 h-6 rounded-full transition-colors relative ${form[key] ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  )

  return (
    <div className='space-y-6 max-w-xl'>
      <div>
        <h2 className='text-base font-semibold text-gray-900 dark:text-white'>Alert Rules</h2>
        <p className='text-sm text-gray-500 mt-1'>Control which events trigger alerts for your fleet</p>
      </div>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
        {toggleRow('speeding',   'Speeding alerts',       'Fires when a van exceeds your speed limit')}
        {toggleRow('afterHours', 'After-hours movement',  'Fires when ignition is on outside business hours')}
        {[
          ['Engine fault alerts',  'Always on — fires when OBD detects a fault code'],
          ['Low battery alerts',   'Always on — fires when voltage drops below threshold'],
          ['Towing detection',     'Always on — fires when van moves with ignition off'],
          ['Crash detection',      'Always on — fires on accelerometer impact event'],
        ].map(([label, desc]) => (
          <div key={label} className='flex items-center justify-between px-5 py-4'>
            <div>
              <p className='text-sm font-medium text-gray-800 dark:text-white'>{label}</p>
              <p className='text-xs text-gray-400 mt-0.5'>{desc}</p>
            </div>
            <span className='text-xs text-teal-600 font-medium'>Always on</span>
          </div>
        ))}
      </div>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-5'>
        <p className='text-sm font-semibold text-gray-800 dark:text-white'>Thresholds</p>

        <div>
          <label className='block text-xs font-medium text-gray-500 mb-1.5'>Speed limit (km/h)</label>
          <input
            type='number'
            value={form.speedLimit}
            onChange={e => setForm(f => ({ ...f, speedLimit: parseInt(e.target.value) || 110 }))}
            className='w-28 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white'
          />
          <p className='text-xs text-gray-400 mt-1'>Alert fires when any van exceeds this speed</p>
        </div>

        <div>
          <label className='block text-xs font-medium text-gray-500 mb-1.5'>Low battery threshold (volts)</label>
          <input
            type='number'
            step='0.1'
            value={form.voltageThreshold}
            onChange={e => setForm(f => ({ ...f, voltageThreshold: parseFloat(e.target.value) || 11.5 }))}
            className='w-28 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white'
          />
          <p className='text-xs text-gray-400 mt-1'>Alert fires when external voltage drops below this</p>
        </div>

        <div>
          <label className='block text-xs font-medium text-gray-500 mb-1.5'>SMS number for critical alerts (optional)</label>
          <input
            type='tel'
            value={form.smsNumber}
            onChange={e => setForm(f => ({ ...f, smsNumber: e.target.value }))}
            placeholder='+61400000000'
            className='w-48 h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white'
          />
          <p className='text-xs text-gray-400 mt-1'>Crash and towing alerts will SMS this number</p>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className='h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50'
      >
        {saving ? 'Saving...' : saved ? 'Saved ✓' : 'Save alert rules'}
      </button>
    </div>
  )
}