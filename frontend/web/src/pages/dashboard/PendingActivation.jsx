import { useNavigate } from 'react-router-dom'
import { Lock, LifeBuoy } from 'lucide-react'
import { Card, Button, EmptyState } from '../../components/ui'

/**
 * companies.subscriptionTier === 'locked'. Distinct from a failed fetch — the old dashboard's
 * `isLocked = !stats && !loading` also fired on any network error, telling a fully paid user
 * their account was "pending activation". The server now says so explicitly via `locked: true`.
 */
export default function PendingActivation() {
  const navigate = useNavigate()

  return (
    <div className='flex items-center justify-center min-h-[60vh] px-4'>
      <Card padding='md' className='max-w-sm w-full'>
        <EmptyState
          icon={Lock}
          title='Your account is pending activation'
          description='Choose a plan to activate your fleet tracking. We’ll contact you to confirm payment and activate your account within 24 hours.'
          action={<Button onClick={() => navigate('/billing')}>View plans and pricing</Button>}
          secondaryAction={
            <Button variant='ghost' iconLeft={LifeBuoy} onClick={() => navigate('/settings')}>
              Contact support
            </Button>
          }
        />
      </Card>
    </div>
  )
}
