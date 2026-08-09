import { useNavigate } from 'react-router-dom'
import { CheckCircle2, WifiOff, HelpCircle, Wrench, FileQuestion, AlertOctagon } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, Badge, EmptyState, SkeletonText } from '../../components/ui'
import { sinceLabel } from '../../lib/time'

function AttentionGroup({ title, icon: Icon, items, renderItem, viewAllTo, navigate }) {
  if (!items || items.length === 0) return null
  return (
    <div>
      <div className='flex items-center gap-2 mb-2'>
        <Icon className='size-4 text-fg-subtle shrink-0' aria-hidden='true' />
        <p className='text-xs font-semibold text-fg-muted uppercase tracking-wide'>{title}</p>
        <Badge size='sm'>{items.length}</Badge>
      </div>
      <ul className='space-y-1.5'>{items.slice(0, 3).map(renderItem)}</ul>
      {items.length > 3 && viewAllTo && (
        <button
          type='button' onClick={() => navigate(viewAllTo)}
          className='text-xs text-accent hover:underline mt-1.5'
        >
          View all {items.length}
        </button>
      )}
    </div>
  )
}

function CountTile({ title, icon: Icon, count, description, tone = 'neutral', onClick }) {
  if (!count) return null
  return (
    <div>
      <div className='flex items-center gap-2 mb-2'>
        <Icon className={tone === 'danger' ? 'size-4 text-danger-fg shrink-0' : 'size-4 text-fg-subtle shrink-0'} aria-hidden='true' />
        <p className='text-xs font-semibold text-fg-muted uppercase tracking-wide'>{title}</p>
      </div>
      <button
        type='button' onClick={onClick}
        className={tone === 'danger'
          ? 'text-2xl font-semibold text-danger-fg tabular hover:underline'
          : 'text-2xl font-semibold text-fg tabular hover:text-accent transition-colors'}
      >
        {count}
      </button>
      <p className='text-xs text-fg-subtle mt-0.5'>{description}</p>
    </div>
  )
}

function LoadingBlock() {
  return (
    <Card>
      <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
      <CardContent className='pt-0'>
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
          {Array.from({ length: 3 }).map((_, i) => <SkeletonText key={i} lines={3} />)}
        </div>
      </CardContent>
    </Card>
  )
}

export default function NeedsAttention({ attention, criticalAlertsCount, loading }) {
  const navigate = useNavigate()
  if (loading) return <LoadingBlock />

  const a = attention ?? {}
  const critical = criticalAlertsCount ?? 0
  const allClear =
    (a.offlineVehicles?.length ?? 0) === 0 &&
    (a.neverReportedVehicles?.length ?? 0) === 0 &&
    (a.maintenanceDue?.length ?? 0) === 0 &&
    (a.unclassifiedTrips ?? 0) === 0 &&
    critical === 0

  return (
    <Card>
      <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
      <CardContent className='pt-0'>
        {allClear ? (
          <EmptyState
            icon={CheckCircle2} tone='success' size='sm'
            title='All clear' description='Nothing needs your attention right now.'
          />
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-5'>
            <AttentionGroup
              title='Offline vehicles' icon={WifiOff} items={a.offlineVehicles} navigate={navigate}
              viewAllTo='/live-map?status=offline'
              renderItem={v => (
                <li key={v.vehicleId} className='flex items-center justify-between text-sm gap-2'>
                  <span className='text-fg truncate'>{v.name}</span>
                  <span className='text-xs text-fg-subtle shrink-0 tabular'>{sinceLabel(v.lastSeen)} ago</span>
                </li>
              )}
            />
            <AttentionGroup
              title='Never reported' icon={HelpCircle} items={a.neverReportedVehicles} navigate={navigate}
              viewAllTo='/settings?tab=vehicles'
              renderItem={v => (
                <li key={v.vehicleId} className='text-sm text-fg truncate'>{v.name}</li>
              )}
            />
            <AttentionGroup
              title='Maintenance due' icon={Wrench} items={a.maintenanceDue} navigate={navigate}
              viewAllTo='/maintenance'
              renderItem={m => (
                <li key={m.id} className='flex items-center justify-between text-sm gap-2'>
                  <span className='text-fg truncate'>{m.vehicleName} — {m.type}</span>
                  {m.overdue
                    ? <Badge variant='danger' size='sm'>Overdue</Badge>
                    : <span className='text-xs text-fg-subtle shrink-0'>{m.dueDate}</span>}
                </li>
              )}
            />
            <CountTile
              title='Unclassified trips' icon={FileQuestion}
              count={a.unclassifiedTrips} description='Awaiting business/personal classification'
              onClick={() => navigate('/fbt')}
            />
            <CountTile
              title='Critical alerts' icon={AlertOctagon} tone='danger'
              count={critical} description='Unread, needs review'
              onClick={() => navigate('/alerts?severity=critical')}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
