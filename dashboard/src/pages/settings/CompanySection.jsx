import { useState } from 'react'
import api from '../../lib/api'

export default function CompanySection({ company, setCompany, loading }) {
  const [form, setForm] = useState({
    name:    company?.name    || '',
    phone:   company?.phone   || '',
    address: company?.address || '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function save() {
    setSaving(true)
    try {
      const res = await api.put('/api/settings/company', form)
      setCompany(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Company</h1>
      <p className='text-sm text-gray-500 mb-6'>Your business details</p>
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4'>
        {[
          { key: 'name',    label: 'Company name',  placeholder: 'Your company name' },
          { key: 'phone',   label: 'Phone number',  placeholder: '+61 4XX XXX XXX' },
          { key: 'address', label: 'Address',        placeholder: '123 Main St, Sydney NSW 2000' },
        ].map(f => (
          <div key={f.key}>
            <label className='block text-xs font-medium text-gray-500 mb-1.5'>{f.label}</label>
            <input
              value={form[f.key]}
              onChange={e => setForm(c => ({ ...c, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        ))}
        <button
          onClick={save}
          disabled={saving}
          className={`h-10 px-5 text-white text-sm font-semibold rounded-lg transition ${
            saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-50'
          }`}
        >
          {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
