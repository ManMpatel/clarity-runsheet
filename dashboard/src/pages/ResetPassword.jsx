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
      await api.post('/api/auth/reset-password', { token, newPassword: password })
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
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <p className='text-sm text-gray-500'>Invalid link. <Link to='/forgot-password' className='text-blue-600 hover:underline'>Request a new one</Link></p>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <div className='h-14 flex items-center px-8 border-b border-gray-200 bg-white'>
        <span className='text-base font-bold text-blue-600'>Clarity Fleet</span>
      </div>
      <div className='flex-1 flex items-center justify-center px-4'>
        <div className='w-full max-w-sm'>
          {done ? (
            <div className='text-center'>
              <div className='text-5xl mb-4'>✅</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Password updated</h1>
              <p className='text-sm text-gray-500'>Taking you to login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'>
              <h1 className='text-xl font-bold text-gray-900 mb-5'>Set a new password</h1>
              {error && <p className='text-sm text-red-600 mb-3'>{error}</p>}
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>New password</label>
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='At least 8 characters'
                required
                className='w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4'
              />
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Confirm new password</label>
              <input
                type='password'
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder='Re-enter password'
                required
                className='w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4'
              />
              <button type='submit' disabled={loading}
                className='w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition'>
                {loading ? 'Saving...' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}