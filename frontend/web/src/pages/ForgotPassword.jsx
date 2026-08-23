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
      await api.post('/auth/forgot-password', { email })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
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
              <div className='text-5xl mb-4'>📬</div>
              <h1 className='text-[22px] font-semibold text-fg mb-2 tracking-tight'>Check your inbox</h1>
              <p className='text-[15px] text-fg-muted mb-6'>
                If an account exists for {email}, we've sent a link to reset your password.
              </p>
              <Link to='/login' className='text-sm text-accent hover:underline'>Back to login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='bg-surface rounded-3xl border border-border shadow-md p-8'>
              <h1 className='text-[22px] font-semibold text-fg mb-1 tracking-tight'>Reset your password</h1>
              <p className='text-[15px] text-fg-muted mb-5'>Enter your email and we'll send you a reset link</p>
              {error && <p className='text-sm text-danger-fg mb-3'>{error}</p>}
              <label className='block text-[13px] font-medium text-fg-muted mb-1.5'>Email address</label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='name@company.com.au'
                required
                className='w-full h-12 px-4 rounded-xl border border-border bg-surface-2/70 text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none focus:bg-surface focus:ring-4 focus:ring-ring/15 focus:border-accent mb-4 transition'
              />
              <button type='submit' disabled={loading}
                className='w-full h-12 bg-accent hover:bg-accent-hover disabled:opacity-50 text-fg-on-accent text-[15px] font-semibold rounded-xl shadow-sm transition active:scale-[0.98]'>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <Link to='/login' className='block text-center text-sm text-accent hover:underline mt-4'>Back to login</Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
