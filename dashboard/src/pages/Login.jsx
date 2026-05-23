import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore(s => s.setAuth)

  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/api/auth/login', form)
      setAuth(res.data.token, res.data.user)
      if (!res.data.onboardingComplete) {
        navigate('/onboarding')
      } else {
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>

      {/* Top bar */}
      <div className='h-14 flex items-center px-8 border-b border-gray-200 bg-white'>
        <span className='text-base font-bold text-blue-600'>Clarity Fleet</span>
      </div>

      {/* Center */}
      <div className='flex-1 flex items-center justify-center px-4 py-12'>
        <div className='w-full max-w-sm'>

          {/* Header */}
          <div className='mb-8 text-center'>
            <h1 className='text-2xl font-bold text-gray-900 mb-1'>Welcome back</h1>
            <p className='text-sm text-gray-500'>Sign in to your fleet dashboard</p>
          </div>

          {/* Card */}
          <div className='bg-white rounded-2xl border border-gray-200 shadow-sm p-8'>
            <form onSubmit={handleSubmit} className='space-y-5'>

              {error && (
                <div className='bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600'>
                  {error}
                </div>
              )}

              <div>
                <label className='block text-xs font-semibold text-gray-600 mb-1.5'>
                  Email address
                </label>
                <input
                  type='email'
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder='name@company.com.au'
                  required
                  className='w-full h-11 px-4 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
                />
              </div>

              <div>
                <div className='flex items-center justify-between mb-1.5'>
                  <label className='text-xs font-semibold text-gray-600'>Password</label>
                  <button type='button'
                    className='text-xs text-blue-600 hover:text-blue-700 font-medium'>
                    Forgot password?
                  </button>
                </div>
                <div className='relative'>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder='••••••••'
                    required
                    className='w-full h-11 px-4 pr-11 rounded-xl border border-gray-200 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
                  />
                  <button type='button' onClick={() => setShowPw(!showPw)}
                    className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium'>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button type='submit' disabled={loading}
                className='w-full h-11 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition mt-2'>
                {loading ? 'Signing in...' : 'Sign in'}
              </button>

            </form>
          </div>

          {/* Footer */}
          <p className='text-center text-sm text-gray-500 mt-6'>
            Don't have an account?{' '}
            <Link to='/signup' className='text-blue-600 hover:text-blue-700 font-semibold'>
              Sign up free
            </Link>
          </p>

        </div>
      </div>

      {/* Bottom */}
      <div className='h-12 flex items-center justify-center'>
        <p className='text-xs text-gray-400'>Clarity Fleet © 2026</p>
      </div>
    </div>
  )
}