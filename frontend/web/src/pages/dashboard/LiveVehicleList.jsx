import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Truck } from 'lucide-react'
import {
  Card, CardHeader, CardTitle, CardToolbar, CardContent, Input, FilterChip,
  EmptyState, ErrorState, SkeletonRow,
} from '../../components/ui'
import VehicleRow from './VehicleRow'
import { vehicleStatus } from '../../lib/fleet-status'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'moving', label: 'Moving' },
  { value: 'idle', label: 'Idle' },
  { value: 'stopped', label: 'Stopped' },
  { value: 'offline', label: 'Offline' },
]

export default function LiveVehicleList({ vans, loading, error, onRetry }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return vans
      .map(v => ({ ...v, _status: vehicleStatus(v) }))
      .filter(v => filter === 'all' || v._status === filter)
      .filter(v => !q || (v.name || v.imei).toLowerCase().includes(q))
  }, [vans, filter, query])

  const visible = rows.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live vehicles</CardTitle>
        <CardToolbar>
          <Input
            size='sm' iconLeft={Search} placeholder='Search…' value={query}
            onChange={e => setQuery(e.target.value)} className='w-32 sm:w-40' aria-label='Search vehicles'
          />
        </CardToolbar>
      </CardHeader>

      <div className='px-5 pb-3 flex flex-wrap gap-1.5'>
        {FILTERS.map(f => (
          <FilterChip key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
            {f.label}
          </FilterChip>
        ))}
      </div>

      <CardContent className='pt-0'>
        {error ? (
          <ErrorState compact title="Couldn't load vehicles" onRetry={onRetry} />
        ) : loading ? (
          <div className='space-y-0.5'>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            size='sm' icon={Truck}
            title={vans.length === 0 ? 'No vehicles reporting' : 'No vehicles match'}
            description={vans.length === 0 ? undefined : 'Try a different filter or search term.'}
          />
        ) : (
          <>
            <ul className='divide-y divide-border -mx-5'>
              {visible.map(van => (
                // Keying on updatedAt (not just imei) forces a fresh mount whenever the socket
                // pushes new data for this vehicle, which is what plays the row's one-shot
                // "just updated" flash animation without any extra state to track.
                <VehicleRow
                  key={`${van.imei}:${van.updatedAt ?? ''}`}
                  van={van}
                  onClick={() => navigate(`/live-map?imei=${van.imei}`)}
                />
              ))}
            </ul>
            {rows.length > visible.length && (
              <button
                type='button'
                onClick={() => navigate('/live-map')}
                className='w-full text-center text-xs text-accent hover:underline pt-3'
              >
                View all {rows.length} on the map
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
