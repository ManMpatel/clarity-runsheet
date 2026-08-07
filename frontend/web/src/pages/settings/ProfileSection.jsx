import { useState } from 'react'
import api from '../../lib/api'
import Toast from '../../components/Toast'

export default function ProfileSection({ me, setMe, loading }) {
  const [editing, setEditing]     = useState(false)
  const [name, setName]           = useState(me?.name || '')
  const [showPassword, setShowPassword] = useState(false)
  const [pwForm, setPwForm]       = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving]       = useState(false)
  const [toast, setToast]         = useState(null)
  const [resending, setResending] = useState(false)

  async function saveName() {
    setSaving(true)
    try {
      const res = await api.put('/auth/profile', { name })
      setMe(m => ({ ...m, name: res.data.name }))
      setEditing(false)
      setToast({ message: 'Name updated', type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setSaving(false) }
  }

  async function savePassword() {
    if (pwForm.next !== pwForm.confirm) {
      setToast({ message: 'Passwords do not match', type: 'error' })
      return
    }
    setSaving(true)
    try {
      await api.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setPwForm({ current: '', next: '', confirm: '' })
      setShowPassword(false)
      setToast({ message: 'Password changed', type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setSaving(false) }
  }

  async function resendVerification() {
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      setToast({ message: 'Verification email sent — check your inbox', type: 'success' })
    } catch (err) {
      setToast({ message: err.response?.data?.error || 'Failed', type: 'error' })
    } finally { setResending(false) }
  }

  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>
  if (!me) return null

  return (
    <div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Profile</h1>
      <p className='text-sm text-gray-500 mb-6'>Your account information</p>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 mb-4'>
        <div className='px-6 py-4 flex items-center justify-between'>
          <div>
            <p className='text-xs text-gray-500 mb-0.5'>Full name</p>
            {editing ? (
              <div className='flex items-center gap-2 mt-1'>
                <input value={name} onChange={e => setName(e.target.value)}
                  className='h-8 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
                <button onClick={saveName} disabled={saving}
                  className='h-8 px-3 bg-blue-600 text-white text-xs font-semibold rounded-lg'>
                  {saving ? '...' : 'Save'}
                </button>
                <button onClick={() => setEditing(false)}
                  className='h-8 px-3 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg'>
                  Cancel
                </button>
              </div>
            ) : (
              <p className='text-sm font-medium text-gray-900 dark:text-white'>{me.name}</p>
            )}
          </div>
          {!editing && (
            <button onClick={() => { setEditing(true); setName(me.name) }}
              className='text-xs text-blue-600 hover:text-blue-700 font-medium'>
              Edit
            </button>
          )}
        </div>

        <div className='px-6 py-4 flex items-center justify-between'>
          <div>
            <p className='text-xs text-gray-500 mb-0.5'>Email address</p>
            <p className='text-sm font-medium text-gray-900 dark:text-white'>{me.email}</p>
          </div>
          <div className='flex items-center gap-2'>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              me.emailVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {me.emailVerified ? 'Verified' : 'Not verified'}
            </span>
            {!me.emailVerified && (
              <button onClick={resendVerification} disabled={resending}
                className='text-xs text-blue-600 hover:text-blue-700 font-medium'>
                {resending ? 'Sending...' : 'Resend email'}
              </button>
            )}
          </div>
        </div>

        <div className='px-6 py-4'>
          <p className='text-xs text-gray-500 mb-0.5'>Role</p>
          <p className='text-sm font-medium text-gray-900 dark:text-white capitalize'>{me.role}</p>
        </div>

        <div className='px-6 py-4'>
          <p className='text-xs text-gray-500 mb-0.5'>Member since</p>
          <p className='text-sm font-medium text-gray-900 dark:text-white'>
            {me.createdAt ? new Date(me.createdAt).toLocaleDateString('en-AU') : '—'}
          </p>
        </div>
      </div>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6'>
        <div className='flex items-center justify-between mb-4'>
          <div>
            <p className='text-sm font-semibold text-gray-900 dark:text-white'>Password</p>
            <p className='text-xs text-gray-500'>Change your login password</p>
          </div>
          <button onClick={() => setShowPassword(!showPassword)}
            className='text-xs text-blue-600 hover:text-blue-700 font-medium'>
            {showPassword ? 'Cancel' : 'Change password'}
          </button>
        </div>

        {showPassword && (
          <div className='space-y-3'>
            {[
              { key: 'current',  label: 'Current password',  placeholder: '••••••••' },
              { key: 'next',     label: 'New password',       placeholder: 'Min 8 characters' },
              { key: 'confirm',  label: 'Confirm new password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className='block text-xs text-gray-500 mb-1'>{f.label}</label>
                <input type='password' value={pwForm[f.key]} placeholder={f.placeholder}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500' />
              </div>
            ))}
            <button onClick={savePassword} disabled={saving}
              className='h-9 px-5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg'>
              {saving ? 'Saving...' : 'Update password'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

