import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../lib/api'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('No verification token found.')
      return
    }

    api.get(`/api/auth/verify-email?token=${token}`)
      .then(() => {
        setStatus('success')
        setMessage('Your email has been verified. You can now log in.')
      })
      .catch(err => {
        setStatus('error')
        setMessage(err.response?.data?.error || 'Verification failed.')
      })
  }, [])

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center px-4'>
      <div className='bg-white rounded-xl border border-gray-200 p-8 max-w-md w-full text-center'>
        <h1 className='text-2xl font-bold text-blue-600 mb-6'>Clarity Fleet</h1>

        {status === 'loading' && (
          <p className='text-gray-500'>Verifying your email...</p>
        )}

        {status === 'success' && (
          <>
            <div className='text-4xl mb-4'>✓</div>
            <h2 className='text-lg font-semibold text-gray-900 mb-2'>Email verified</h2>
            <p className='text-sm text-gray-500 mb-6'>{message}</p>
            <Link
              to='/login'
              className='block w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition'
            >
              Go to login
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className='text-4xl mb-4'>✕</div>
            <h2 className='text-lg font-semibold text-gray-900 mb-2'>Verification failed</h2>
            <p className='text-sm text-gray-500 mb-6'>{message}</p>
            <Link
              to='/signup'
              className='block w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition'
            >
              Back to signup
            </Link>
          </>
        )}
      </div>
    </div>
  )
}