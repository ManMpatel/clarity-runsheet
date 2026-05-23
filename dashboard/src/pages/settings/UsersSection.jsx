import { useState } from 'react'
import api from '../../lib/api'

export default function UsersSection({ users, setUsers, loading }) {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'fleetManager' })

  async function addUser() {
    try {
      const res = await api.post('/api/settings/users', form)
      setUsers(u => [...u, res.data])
      setShowAdd(false)
      setForm({ name: '', email: '', password: '', role: 'fleetManager' })
    } catch (err) {
      console.error(err.message)
    }
  }

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Users</h1>
          <p className='text-sm text-gray-500'>{users.length} team members</p>
        </div>
        <button onClick={() => setShowAdd(true)} className='h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg'>
          + Add user
        </button>
      </div>

      {showAdd && (
        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 mb-4 space-y-3'>
          <h3 className='text-sm font-semibold text-gray-800 dark:text-white'>New team member</h3>
          {[
            { key: 'name', placeholder: 'Full name', type: 'text' },
            { key: 'email', placeholder: 'Email address', type: 'email' },
            { key: 'password', placeholder: 'Password', type: 'password' },
          ].map(f => (
            <input key={f.key} type={f.type} value={form[f.key]}
              onChange={e => setForm(u => ({ ...u, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
          ))}
          <select value={form.role} onChange={e => setForm(u => ({ ...u, role: e.target.value }))}
            className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none'>
            <option value='fleetManager'>Fleet Manager</option>
            <option value='companyAdmin'>Company Admin</option>
          </select>
          <div className='flex gap-2'>
            <button onClick={addUser} className='flex-1 h-9 bg-blue-600 text-white text-sm font-semibold rounded-lg'>Add</button>
            <button onClick={() => setShowAdd(false)} className='flex-1 h-9 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg'>Cancel</button>
          </div>
        </div>
      )}

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
        {users.length === 0
          ? <p className='text-sm text-gray-400 p-6 text-center'>No other users yet</p>
          : users.map((u, i) => (
            <div key={i} className='px-5 py-3.5 flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-900 dark:text-white'>{u.name}</p>
                <p className='text-xs text-gray-400'>{u.email}</p>
              </div>
              <span className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium capitalize'>{u.role}</span>
            </div>
          ))
        }
      </div>
    </div>
  )
}