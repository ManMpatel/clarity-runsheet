import { useState } from 'react'
import api from '../../lib/api'
import Toast from '../../components/Toast'

export default function CompanySection({ company, setCompany, loading }) {
  const [form, setForm] = useState({
    name:    company?.name    || '',
    phone:   company?.phone   || '',
    address: company?.address || '',
    abn:     company?.abn     || '',
    website: company?.website || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast]   = useState(null)

  async function save() {
    setSaving(true)
    try {
      const res = await api.put('/settings/company', form)
      setCompany(res.data)
      setToast({ message: 'Company details saved', type: 'success' })
    } catch (err) {
      setToast({ message: 'Failed to save', type: 'error' })
    } finally { setSaving(false) }
  }

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Company</h1>
      <p className='text-sm text-gray-500 mb-6'>Your business details</p>
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4'>
        {[
          { key: 'name',    label: 'Company name',    placeholder: 'Your company name',        icon: '🏢' },
          { key: 'abn',     label: 'ABN',             placeholder: 'XX XXX XXX XXX',           icon: '🇦🇺' },
          { key: 'phone',   label: 'Phone number',    placeholder: '+61 4XX XXX XXX',          icon: '📞' },
          { key: 'address', label: 'Address',         placeholder: '123 Main St, Sydney NSW',  icon: '📍' },
          { key: 'website', label: 'Website',         placeholder: 'https://yourcompany.com.au', icon: '🌐' },
        ].map(f => (
          <div key={f.key}>
            <label className='block text-xs font-medium text-gray-500 mb-1.5'>{f.label}</label>
            <div className='relative'>
              <span className='absolute left-3 top-1/2 -translate-y-1/2 text-sm'>{f.icon}</span>
              <input
                value={form[f.key]}
                onChange={e => setForm(c => ({ ...c, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className='w-full h-10 pl-9 pr-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
            </div>
          </div>
        ))}
        <div className='flex justify-end pt-2'>
          <button onClick={save} disabled={saving}
            className='h-10 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition'>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}