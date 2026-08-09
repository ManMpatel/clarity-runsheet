import { useEffect, useState } from 'react'
import api from '../../lib/api'
import Banner from '../ui/Banner'
import Button from '../ui/Button'

/** Extracted from AppShell so the shell component itself stays focused on layout. */
export default function VerificationBanner() {
  const [unverified, setUnverified] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(res => {
      if (!res.data.emailVerified) setUnverified(true)
    }).catch(() => {})
  }, [])

  async function resend() {
    setResending(true)
    try {
      await api.post('/auth/resend-verification')
      setDismissed(true)
    } catch (err) {
      console.error(err.message)
    } finally {
      setResending(false)
    }
  }

  if (!unverified || dismissed) return null

  return (
    <Banner
      tone='warning'
      onDismiss={() => setDismissed(true)}
      action={
        <Button variant='ghost' size='sm' onClick={resend} loading={resending} className='shrink-0'>
          Resend verification email
        </Button>
      }
    >
      Your email address is not verified. Some features may be limited.
    </Banner>
  )
}
