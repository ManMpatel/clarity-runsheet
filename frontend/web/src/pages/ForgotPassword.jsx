import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/api/auth/forgot-password', { email })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
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
              <div className='text-5xl mb-4'>📬</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Check your inbox</h1>
              <p className='text-sm text-gray-500 mb-6'>
                If an account exists for {email}, we've sent a link to reset your password.
              </p>
              <Link to='/login' className='text-sm text-blue-600 hover:underline'>Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'>
              <h1 className='text-xl font-bold text-gray-900 mb-1'>Reset your password</h1>
              <p className='text-sm text-gray-500 mb-5'>Enter your email and we'll send you a reset link</p>
              {error && <p className='text-sm text-red-600 mb-3'>{error}</p>}
              <label className='block text-xs font-semibold text-gray-600 mb-1.5'>Email address</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='name@company.com.au'
                required
                className='w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4'
              />
              <button type='submit' disabled={loading}
                className='w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition'>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <Link to='/login' className='block text-center text-sm text-blue-600 hover:underline mt-4'>Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
