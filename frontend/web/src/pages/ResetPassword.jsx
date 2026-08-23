import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()

  const [password, setPassword]               = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')
  const [done, setDone]                       = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, newPassword: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className='min-h-svh flex items-center justify-center bg-canvas'>
        <p className='text-sm text-fg-muted'>Invalid link. <Link to='/forgot-password' className='text-accent hover:underline'>Request a new one</Link></p>
      </div>
    )
  }

  return (
    <div className='min-h-svh bg-canvas flex flex-col'>
      <div className='h-14 flex items-center px-8 bg-surface/80 backdrop-blur-xl border-b border-border'>
        <span className='text-[15px] font-semibold text-accent tracking-tight'>Clarity Fleet</span>
      </div>
      <div className='flex-1 flex items-center justify-center px-4'>
        <div className='w-full max-w-sm'>
          {done ? (
            <div className='text-center'>
              <div className='text-5xl mb-4'>✅</div>
              <h1 className='text-[22px] font-semibold text-fg mb-2 tracking-tight'>Password updated</h1>
              <p className='text-[15px] text-fg-muted'>Taking you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='bg-surface rounded-3xl border border-border shadow-md p-8'>
              <h1 className='text-[22px] font-semibold text-fg mb-5 tracking-tight'>Set a new password</h1>
              {error && <p className='text-sm text-danger-fg mb-3'>{error}</p>}
              <label className='block text-[13px] font-medium text-fg-muted mb-1.5'>New password</label>
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='At least 8 characters'
                required
                className='w-full h-12 px-4 rounded-xl border border-border bg-surface-2/70 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none focus:bg-surface focus:ring-4 focus:ring-ring/15 focus:border-accent mb-4 transition'
              />
              <label className='block text-[13px] font-medium text-fg-muted mb-1.5'>Confirm new password</label>
              <input
                type='password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder='Re-enter password'
                required
                className='w-full h-12 px-4 rounded-xl border border-border bg-surface-2/70 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none focus:bg-surface focus:ring-4 focus:ring-ring/15 focus:border-accent mb-4 transition'
              />
              <button type='submit' disabled={loading}
                className='w-full h-12 bg-accent hover:bg-accent-hover disabled:opacity-50 text-fg-on-accent text-[15px] font-semibold rounded-xl shadow-sm transition active:scale-[0.98]'>
                {loading ? 'Saving...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}