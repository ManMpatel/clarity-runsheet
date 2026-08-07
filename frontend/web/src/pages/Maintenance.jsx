import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function Maintenance() {
  const [records, setRecords]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm]         = useState({
    vehicleId: '', type: '', dueDate: '', dueOdometer: '', notes: ''
  })

  useEffect(() => {
    async function load() {
      try {
        const [mRes, vRes] = await Promise.all([
          api.get('/api/maintenance'),
          api.get('/api/vehicles'),
        ])
        setRecords(mRes.data)
        setVehicles(vRes.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleAdd() {
    try {
      const res = await api.post('/api/maintenance', form)
      setRecords(r => [res.data, ...r])
      setShowAdd(false)
      setForm({ vehicleId: '', type: '', dueDate: '', dueOdometer: '', notes: '' })
    } catch (err) {
      console.error(err.message)
    }
  }

  async function handleComplete(id) {
    try {
      const res = await api.put(`/api/maintenance/${id}/complete`, {
        completedDate: new Date().toISOString(),
      })
      setRecords(r => r.map(rec => rec._id === id ? res.data : rec))
      setSelected(null)
    } catch (err) {
      console.error(err.message)
    }
  }

  const dueThisWeek = records.filter(r => {
    if (r.status !== 'pending' || !r.dueDate) return false
    const diff = new Date(r.dueDate) - new Date()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000
  })

  const overdue = records.filter(r => {
    if (r.status !== 'pending' || !r.dueDate) return false
    return new Date(r.dueDate) < new Date()
  })

  const upcoming = records.filter(r => {
    if (r.status !== 'pending' || !r.dueDate) return false
    const diff = new Date(r.dueDate) - new Date()
    return diff >= 7 * 24 * 60 * 60 * 1000
  })

  const completed = records.filter(r => r.status === 'completed')

  return (
    <div className='p-6'>

      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Maintenance</h1>
          <p className='text-sm text-gray-500 mt-1'>Service schedule and history</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'
        >
          + Add service
        </button>
      </div>

      <div className='grid grid-cols-3 gap-4 mb-6'>
        <SummaryCard label='Overdue'      value={overdue.length}      color='red' />
        <SummaryCard label='Due this week' value={dueThisWeek.length} color='amber' />
        <SummaryCard label='Completed'    value={completed.length}    color='teal' />
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading...</p>
      ) : (
        <div className='space-y-6'>

          {overdue.length > 0 && (
            <Section title='Overdue' color='red' records={overdue}
              vehicles={vehicles} onSelect={setSelected} />
          )}

          {dueThisWeek.length > 0 && (
            <Section title='Due this week' color='amber' records={dueThisWeek}
              vehicles={vehicles} onSelect={setSelected} />
          )}

          {upcoming.length > 0 && (
            <Section title='Upcoming' color='blue' records={upcoming}
              vehicles={vehicles} onSelect={setSelected} />
          )}

          {completed.length > 0 && (
            <Section title='Completed' color='gray' records={completed}
              vehicles={vehicles} onSelect={setSelected} />
          )}

          {records.length === 0 && (
            <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
              <p className='text-sm text-gray-400'>No maintenance records yet</p>
            </div>
          )}

        </div>
      )}

      {showAdd && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base font-semibold text-gray-800'>Add service record</h3>
              <button onClick={() => setShowAdd(false)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>
            <div className='space-y-3'>
              <select
                value={form.vehicleId}
                onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              >
                <option value=''>Select vehicle</option>
                {vehicles.map(v => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
              <input
                placeholder='Service type (e.g. Oil change)'
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='date'
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                placeholder='Due odometer (km)'
                type='number'
                value={form.dueOdometer}
                onChange={e => setForm(f => ({ ...f, dueOdometer: e.target.value }))}
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <textarea
                placeholder='Notes (optional)'
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className='w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none'
              />
            </div>
            <div className='flex gap-3 mt-5'>
              <button
                onClick={handleAdd}
                className='flex-1 h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition'
              >
                Save
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-md p-6'>
            <div className='flex items-center justify-between mb-5'>
              <h3 className='text-base font-semibold text-gray-800'>{selected.type}</h3>
              <button onClick={() => setSelected(null)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'>×</button>
            </div>
            <div className='space-y-2'>
              <DetailRow label='Vehicle' value={
                vehicles.find(v => v._id === selected.vehicleId)?.name || selected.vehicleId
              } />
              <DetailRow label='Due date' value={
                selected.dueDate
                  ? new Date(selected.dueDate).toLocaleDateString('en-AU')
                  : '--'
              } />
              <DetailRow label='Due odometer' value={
                selected.dueOdometer ? `${selected.dueOdometer} km` : '--'
              } />
              <DetailRow label='Status' value={selected.status} />
              {selected.notes && (
                <DetailRow label='Notes' value={selected.notes} />
              )}
            </div>
            <div className='flex gap-3 mt-5'>
              {selected.status === 'pending' && (
                <button
                  onClick={() => handleComplete(selected._id)}
                  className='flex-1 h-9 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition'
                >
                  Mark complete
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                className='flex-1 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

function SummaryCard({ label, value, color }) {
  const colors = {
    red:   'text-red-600 bg-red-50',
    amber: 'text-amber-600 bg-amber-50',
    teal:  'text-teal-600 bg-teal-50',
    gray:  'text-gray-600 bg-gray-50',
  }
  return (
    <div className='bg-white rounded-xl border border-gray-200 p-4 text-center'>
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className='text-xs text-gray-500 mt-1'>{label}</p>
    </div>
  )
}

function Section({ title, color, records, vehicles, onSelect }) {
  const border = {
    red: 'border-red-200', amber: 'border-amber-200',
    blue: 'border-blue-200', gray: 'border-gray-200',
  }
  return (
    <div>
      <h2 className='text-sm font-semibold text-gray-600 mb-3'>{title}</h2>
      <div className='bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden'>
        {records.map((rec, i) => (
          <button
            key={i}
            onClick={() => onSelect(rec)}
            className='w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left transition'
          >
            <div>
              <p className='text-sm font-medium text-gray-800'>{rec.type}</p>
              <p className='text-xs text-gray-400 mt-0.5'>
                {vehicles.find(v => v._id === rec.vehicleId)?.name || rec.vehicleId}
              </p>
            </div>
            <div className='text-right'>
              {rec.dueDate && (
                <p className='text-xs text-gray-500'>
                  {new Date(rec.dueDate).toLocaleDateString('en-AU')}
                </p>
              )}
              {rec.dueOdometer && (
                <p className='text-xs text-gray-400'>{rec.dueOdometer} km</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className='flex justify-between py-1.5 border-b border-gray-100'>
      <span className='text-sm text-gray-500'>{label}</span>
      <span className='text-sm font-medium text-gray-800'>{value}</span>
    </div>
  )
}