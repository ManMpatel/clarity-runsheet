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
  const [done, setDone] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState('')

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
      await api.post('/auth/signup', {
        companyName:   form.companyName,
        name:          form.name,
        email:         form.email,
        password:      form.password,
        driverConsent: form.driverConsent || false,
      })
      setSubmittedEmail(form.email)
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <div className='h-14 flex items-center px-8 border-b border-gray-200 bg-white'>
        <span className='text-base font-bold text-blue-600'>Clarity Fleet</span>
      </div>
      <div className='flex-1 flex items-center justify-center px-4'>
        <div className='w-full max-w-sm text-center'>
          <div className='text-5xl mb-4'>📬</div>
          <h1 className='text-2xl font-bold text-gray-900 mb-2'>Check your inbox</h1>
          <p className='text-sm text-gray-500 mb-1'>We sent a verification link to</p>
          <p className='text-sm font-semibold text-gray-800 mb-6'>{submittedEmail}</p>
          <div className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-left space-y-3 mb-6'>
            <p className='text-sm text-gray-600'>1. Open the email from <strong>Clarity Fleet</strong></p>
            <p className='text-sm text-gray-600'>2. Click <strong>"Confirm my email"</strong></p>
            <p className='text-sm text-gray-600'>3. You'll be taken straight to your dashboard</p>
          </div>
          <p className='text-xs text-gray-400'>
            Didn't get it? Check your spam folder or{' '}
            <button onClick={() => setDone(false)} className='text-blue-600 hover:underline'>
              try again
            </button>
          </p>
        </div>
      </div>
    </div>
  )

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

            <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/auth/google`}
              className='w-full flex items-center justify-center gap-3 h-10 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition mb-3'>
              <svg className='w-4 h-4' viewBox='0 0 24 24'>
                <path fill='#4285F4' d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'/>
                <path fill='#34A853' d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'/>
                <path fill='#FBBC05' d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'/>
                <path fill='#EA4335' d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'/>
              </svg>
              Continue with Google
            </a>

            <div className='relative my-3'>
              <div className='absolute inset-0 flex items-center'>
                <div className='w-full border-t border-gray-200' />
              </div>
              <div className='relative flex justify-center text-xs text-gray-400 bg-white px-2'>
                or sign up with email
              </div>
            </div>

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
