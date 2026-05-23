import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileBottomNav from './MobileBottomNav'
import api from '../../lib/api'

export default function AppShell() {
  const [unverified, setUnverified] = useState(false)
  const [dismissed, setDismissed]   = useState(false)
  const [resending, setResending]   = useState(false)

  useEffect(() => {
    api.get('/api/auth/me').then(res => {
      if (!res.data.emailVerified) setUnverified(true)
    }).catch(() => {})
  }, [])

  async function resend() {
    setResending(true)
    try {
      await api.post('/api/auth/resend-verification')
      setDismissed(true)
    } catch (err) {
      console.error(err.message)
    } finally { setResending(false) }
  }

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-950'>
      <Sidebar />
      <Header />
      <main className='md:ml-60 pt-[60px] md:pt-0 pb-20 md:pb-0 min-h-screen'>
        {unverified && !dismissed && (
          <div className='bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center justify-between'>
            <p className='text-sm text-amber-700'>
              ⚠ Your email is not verified. Some features may be limited.
            </p>
            <div className='flex items-center gap-3'>
              <button onClick={resend} disabled={resending}
                className='text-xs text-amber-700 font-semibold underline hover:no-underline'>
                {resending ? 'Sending...' : 'Resend verification email'}
              </button>
              <button onClick={() => setDismissed(true)}
                className='text-xs text-amber-500 hover:text-amber-700'>
                ✕
              </button>
            </div>
          </div>
        )}
        <Outlet />
      </main>
      <MobileBottomNav />
    </div>
  )
}