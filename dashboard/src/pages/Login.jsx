import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import api from '../lib/api'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const login    = useAuthStore(s => s.login)
  const initDark = useUiStore(s => s.initDarkMode)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/api/auth/login', { email, password })
      login(res.data.token, res.data.user)
      initDark()
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>

        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-blue-600 tracking-tight'>
            Clarity Fleet
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-2'>
            Fleet management platform
          </p>
        </div>

        <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-white mb-6'>
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Email address
              </label>
              <input
                type='email'
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder='name@company.com.au'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Password
              </label>
              <input
                type='password'
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder='••••••••'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition'
              />
            </div>

            {error && (
              <div className='text-sm text-red-500 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2'>
                {error}
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className='text-center text-xs text-gray-400 dark:text-gray-600 mt-6'>
          Clarity Fleet © {new Date().getFullYear()}
        </p>

      </div>
      <p className='text-center text-sm text-gray-500 mt-4'>
        Don't have an account?{' '}
        <a href='/signup' className='text-blue-600 hover:underline'>
          Sign up free
        </a>
      </p>
    </div>
  )
}