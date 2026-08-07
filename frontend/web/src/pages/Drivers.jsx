import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Drivers() {
  const [drivers, setDrivers]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(null)
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')
  const [form, setForm] = useState({
    name: '', email: '', mobile: '',
    licenceNumber: '', licenceExpiry: '', vehicleId: '',
  })

  useEffect(() => {
    async function load() {
      try {
        const [dRes, vRes] = await Promise.all([
          api.get('/drivers'),
          api.get('/vehicles'),
        ])
        setDrivers(dRes.data)
        setVehicles(vRes.data)
      } catch (err) {
        console.error(err.message)
      } finally { setLoading(false) }
    }
    load()
  }, [])

  function openAdd() {
    setForm({ name: '', email: '', mobile: '', licenceNumber: '', licenceExpiry: '', vehicleId: '' })
    setError('')
    setModal('add')
  }

  function openEdit(driver) {
    setForm({
      name:          driver.name || '',
      email:         driver.email || '',
      mobile:        driver.mobile || '',
      licenceNumber: driver.licenceNumber || '',
      licenceExpiry: driver.licenceExpiry
        ? new Date(driver.licenceExpiry).toISOString().split('T')[0] : '',
      vehicleId:     driver.vehicleId || '',
    })
    setError('')
    setModal(driver)
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.mobile) {
      setError('Name, email and mobile are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (modal === 'add') {
        const res = await api.post('/drivers', form)
        setDrivers(d => [...d, res.data])
      } else {
        const res = await api.put(`/drivers/${modal.id}`, form)
        setDrivers(d => d.map(x => x.id === modal.id ? res.data : x))
      }
      setModal(null)
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed')
    } finally { setSaving(false) }
  }

  async function toggleActive(driver) {
    try {
      const res = await api.put(`/drivers/${driver.id}`, { ...driver, active: !driver.active })
      setDrivers(d => d.map(x => x.id === driver.id ? res.data : x))
    } catch (err) { console.error(err.message) }
  }

  function licenceTag(expiry) {
    if (!expiry) return null
    const days = Math.ceil((new Date(expiry) - new Date()) / 86400000)
    if (days < 0)   return { label: 'Expired',       cls: 'bg-red-100 text-red-700' }
    if (days <= 30) return { label: `${days}d left`,  cls: 'bg-amber-100 text-amber-700' }
    return { label: new Date(expiry).toLocaleDateString('en-AU'), cls: 'bg-green-100 text-green-700' }
  }

  const vName = id => vehicles.find(v => v.id === id)?.name || '—'

  const FIELDS = [
    { key: 'name',          label: 'Full name',      type: 'text',  ph: 'John Smith' },
    { key: 'email',         label: 'Email',          type: 'email', ph: 'john@company.com' },
    { key: 'mobile',        label: 'Mobile',         type: 'tel',   ph: '+61400000000' },
    { key: 'licenceNumber', label: 'Licence number', type: 'text',  ph: 'NSW12345678' },
    { key: 'licenceExpiry', label: 'Licence expiry', type: 'date',  ph: '' },
  ]

  return (
    <div className='p-6'>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-white'>Drivers</h1>
          <p className='text-sm text-gray-500 mt-1'>
            {drivers.length} driver{drivers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={openAdd}
          className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition'>
          + Add Driver
        </button>
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading...</p>
      ) : drivers.length === 0 ? (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center'>
          <p className='text-3xl mb-3'>🚐</p>
          <p className='text-sm font-medium text-gray-700 dark:text-gray-300'>No drivers yet</p>
          <p className='text-xs text-gray-400 mt-1'>Add your first driver to get started</p>
        </div>
      ) : (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <table className='w-full text-sm'>
            <thead className='bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700'>
              <tr>
                <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Driver</th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell'>Vehicle</th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell'>Licence</th>
                <th className='px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide'>Status</th>
                <th className='px-4 py-3' />
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
              {drivers.map(driver => {
                const tag = licenceTag(driver.licenceExpiry)
                return (
                  <tr key={driver.id} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-4 py-3'>
                      <p className='font-medium text-gray-800 dark:text-white'>{driver.name}</p>
                      <p className='text-xs text-gray-400 mt-0.5'>{driver.mobile}</p>
                    </td>
                    <td className='px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell'>
                      {vName(driver.vehicleId)}
                    </td>
                    <td className='px-4 py-3 hidden md:table-cell'>
                      {tag
                        ? <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tag.cls}`}>{tag.label}</span>
                        : <span className='text-xs text-gray-400'>Not set</span>
                      }
                    </td>
                    <td className='px-4 py-3'>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${driver.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {driver.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-3'>
                        <button onClick={() => openEdit(driver)}
                          className='text-xs text-blue-600 hover:underline'>Edit</button>
                        <button onClick={() => toggleActive(driver)}
                          className='text-xs text-gray-400 hover:text-gray-600'>
                          {driver.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-white'>
                {modal === 'add' ? 'Add Driver' : 'Edit Driver'}
              </h3>
              <button onClick={() => setModal(null)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>

            <div className='space-y-3'>
              {FIELDS.map(({ key, label, type, ph }) => (
                <div key={key}>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>{label}</label>
                  <input type={type} value={form[key]} placeholder={ph}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className='w-full h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white'
                  />
                </div>
              ))}
              <div>
                <label className='block text-xs font-medium text-gray-500 mb-1'>Assign to vehicle</label>
                <select value={form.vehicleId}
                  onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                  className='w-full h-9 px-3 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white'>
                  <option value=''>Unassigned</option>
                  {vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
            </div>

            {error && <p className='text-xs text-red-500 mt-3'>{error}</p>}

            <div className='flex gap-3 mt-5'>
              <button onClick={handleSave} disabled={saving}
                className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition'>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setModal(null)}
                className='flex-1 h-9 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition'>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}