import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export default function LockedFeature({ plan = 'Mid' }) {
  const navigate = useNavigate()
  const subscriptionTier = useAuthStore(s => s.subscriptionTier)

  const tierRank = { locked: 0, entry: 1, mid: 2, top: 3 }
  const requiredRank = plan === 'Top' ? 3 : 2
  if (tierRank[subscriptionTier] >= requiredRank) return null

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-6'>
      <div className='bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 max-w-md w-full text-center shadow-sm'>
        <div className='text-5xl mb-4'>🔒</div>
        <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-2'>
          {plan} Plan Required
        </h1>
        <p className='text-sm text-gray-500 mb-2'>
          This feature is available on the <strong>{plan}</strong> plan.
          Upgrade at least one vehicle to {plan} to unlock access.
        </p>
        <p className='text-xs text-gray-400 mb-6'>
          {plan === 'Mid'
            ? 'Mid plan includes Driver Behaviour, Geofence Manager, FBT Logbook and Maintenance.'
            : 'Top plan includes Vehicle Health diagnostics, OBD fault codes and Advanced Reports.'}
        </p>
        <div className='flex gap-3'>
          <button
            onClick={() => navigate('/settings')}
            className='flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition'>
            View upgrade options
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className='flex-1 h-10 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition'>
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
