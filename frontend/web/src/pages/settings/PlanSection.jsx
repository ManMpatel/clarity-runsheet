import { TIER_PRICING, monthlyTotal } from '../../lib/pricing'

export default function PlanSection({ company, slots, loading }) {
  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>

  const entryTotal = slots?.slots?.entrySlots || 0
  const midTotal   = slots?.slots?.midSlots   || 0
  const topTotal   = slots?.slots?.topSlots   || 0
  const entryUsed  = slots?.used?.entry || 0
  const midUsed    = slots?.used?.mid   || 0
  const topUsed    = slots?.used?.top   || 0
  const monthly    = monthlyTotal({ entry: entryTotal, mid: midTotal, top: topTotal })

  return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>My Plan</h1>
      <p className='text-sm text-gray-500 mb-6'>Current plan and slot usage</p>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 mb-6'>
        <div className='px-6 py-4 flex items-center justify-between'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Current plan</p>
          <span className={`text-sm font-semibold px-3 py-1 rounded-full capitalize ${
            company?.subscriptionTier === 'locked' ? 'bg-gray-100 text-gray-500' :
            company?.subscriptionTier === 'top'    ? 'bg-purple-100 text-purple-700' :
            company?.subscriptionTier === 'mid'    ? 'bg-blue-100 text-blue-700' :
            'bg-green-100 text-green-700'
          }`}>{company?.subscriptionTier || 'locked'}</span>
        </div>
        <div className='px-6 py-4 flex items-center justify-between'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>Monthly total</p>
          <span className='text-sm font-bold text-gray-900 dark:text-white'>${monthly}/mo</span>
        </div>
      </div>

      <h2 className='text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3'>Slot usage</h2>
      <div className='space-y-3'>
        {[
          { label: `Entry — $${TIER_PRICING.entry}/van`, used: entryUsed, total: entryTotal, color: 'bg-blue-500' },
          { label: `Mid — $${TIER_PRICING.mid}/van`,      used: midUsed,   total: midTotal,   color: 'bg-teal-500' },
          { label: `Top — $${TIER_PRICING.top}/van`,      used: topUsed,   total: topTotal,   color: 'bg-purple-500' },
        ].map(s => (
          <div key={s.label} className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
            <div className='flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2'>
              <span className='font-medium'>{s.label}</span>
              <span>{s.used} / {s.total} used</span>
            </div>
            <div className='h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden'>
              <div className={`h-full rounded-full ${s.color}`}
                style={{ width: s.total > 0 ? `${(s.used / s.total) * 100}%` : '0%' }} />
            </div>
            {s.total === 0 && <p className='text-xs text-gray-400 mt-1'>No slots allocated — contact us to upgrade</p>}
          </div>
        ))}
      </div>
    </div>
  )
}