import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'

export default function VerifyEmail() {
  const [params]  = useSearchParams()
  const navigate  = useNavigate()
  const setAuth   = useAuthStore(s => s.setAuth)
  const token     = params.get('token')
  const [status, setStatus] = useState('waiting')
  const [error, setError]   = useState('')

  async function confirm() {
    setStatus('loading')
    try {
      const res = await api.get(`/api/auth/verify-email?token=${token}`)
      setAuth(res.data.token, res.data.user)
      setStatus('success')
      setTimeout(() => {
        navigate(res.data.onboardingComplete ? '/dashboard' : '/onboarding')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed')
      setStatus('error')
    }
  }

  if (!token) return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center'>
      <p className='text-sm text-red-500'>Invalid verification link.</p>
    </div>
  )

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col'>
      <div className='h-14 flex items-center px-8 border-b border-gray-200 bg-white'>
        <span className='text-base font-bold text-blue-600'>Clarity Fleet</span>
      </div>
      <div className='flex-1 flex items-center justify-center px-4'>
        <div className='w-full max-w-sm text-center'>

          {status === 'waiting' && (
            <>
              <div className='text-5xl mb-4'>&#128140;</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Confirm your email</h1>
              <p className='text-sm text-gray-500 mb-8'>
                Click the button below to verify your email address and access your dashboard.
              </p>
              <button onClick={confirm}
                className='w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition shadow-sm'>
                Confirm my email
              </button>
            </>
          )}

          {status === 'loading' && (
            <>
              <div className='text-5xl mb-4'>&#9203;</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Verifying...</h1>
              <p className='text-sm text-gray-500'>Just a moment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className='text-5xl mb-4'>&#10003;</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Email confirmed!</h1>
              <p className='text-sm text-gray-500'>Taking you to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className='text-5xl mb-4'>&#10007;</div>
              <h1 className='text-2xl font-bold text-gray-900 mb-2'>Link expired</h1>
              <p className='text-sm text-gray-500 mb-6'>{error}</p>
              <button onClick={() => navigate('/login')}
                className='w-full h-11 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition'>
                Back to login
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}