import { ChevronRight } from 'lucide-react'
import { StatusDot } from '../../components/ui'
import { vehicleStatus } from '../../lib/fleet-status'
import { sinceLabel } from '../../lib/time'

export default function VehicleRow({ van, onClick }) {
  const status = vehicleStatus(van)
  const since = sinceLabel(van.stateChangedAt)

  return (
    <li>
      <button
        type='button'
        onClick={onClick}
        className='w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors
                   hover:bg-surface-2 outline-none focus-visible:ring-2 focus-visible:ring-ring
                   focus-visible:ring-inset motion-safe:animate-[row-flash_1.2s_ease-out]'
      >
        <StatusDot status={status} pulse={status === 'moving'} />
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between gap-2'>
            <p className='text-sm font-medium text-fg truncate'>{van.name || van.imei}</p>
            <span className='text-xs text-fg-subtle tabular shrink-0'>{van.speed ?? 0} km/h</span>
          </div>
          <div className='flex items-center justify-between gap-2 mt-0.5'>
            <p className='text-xs text-fg-subtle truncate'>{van.address || '—'}</p>
            <span className='text-xs text-fg-subtle shrink-0 tabular'>
              {van.todayKm != null ? `${van.todayKm} km` : ''}
              {since ? ` · ${since}` : ''}
            </span>
          </div>
        </div>
        <ChevronRight className='size-4 text-fg-subtle shrink-0' aria-hidden='true' />
      </button>
    </li>
  )
}
