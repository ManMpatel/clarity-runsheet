import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../lib/api'

export default function Signup() {
  const [form, setForm] = useState({
    companyName: '', name: '', email: '', password: '', confirmPassword: ''
  })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/signup', {
        companyName: form.companyName,
        name:        form.name,
        email:       form.email,
        password:    form.password,
      })
      navigate('/login?registered=true')
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>

        <div className='text-center mb-8'>
          <h1 className='text-3xl font-bold text-blue-600 tracking-tight'>
            Clarity Fleet
          </h1>
          <p className='text-sm text-gray-500 mt-2'>
            Create your fleet management account
          </p>
        </div>

        <div className='bg-white rounded-xl border border-gray-200 p-8 shadow-sm'>
          <h2 className='text-lg font-semibold text-gray-900 mb-6'>
            Get started for free
          </h2>

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Company name
              </label>
              <input
                value={form.companyName}
                onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                placeholder='RunSheet Deliveries'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Your name
              </label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder='John Smith'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Email address
              </label>
              <input
                type='email'
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder='name@company.com.au'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Password
              </label>
              <input
                type='password'
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder='Min 8 characters'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
              />
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Confirm password
              </label>
              <input
                type='password'
                value={form.confirmPassword}
                onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                placeholder='Repeat password'
                required
                className='w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition'
              />
            </div>

            <div className='flex items-start gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3'>
              <input
                type='checkbox'
                id='driverConsent'
                checked={form.driverConsent || false}
                onChange={e => setForm(f => ({ ...f, driverConsent: e.target.checked }))}
                required
                className='mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <label htmlFor='driverConsent' className='text-xs text-gray-600 leading-relaxed'>
                I confirm that all drivers have been informed their vehicle is being tracked by a GPS device. I understand it is my responsibility to obtain driver consent in accordance with Australian privacy law.
              </label>
            </div>

            {error && (
              <div className='text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
                {error}
              </div>
            )}

            <button
              type='submit'
              disabled={loading}
              className='w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition'
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className='text-center text-sm text-gray-500 mt-4'>
            Already have an account?{' '}
            <Link to='/login' className='text-blue-600 hover:underline'>
              Sign in
            </Link>
          </p>
        </div>

        <p className='text-center text-xs text-gray-400 mt-6'>
          By signing up you agree to our terms of service. No credit card required.
        </p>

      </div>
    </div>
  )
}
