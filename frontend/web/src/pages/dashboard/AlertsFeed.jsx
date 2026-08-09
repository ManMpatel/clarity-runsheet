import { useNavigate } from 'react-router-dom'
import { CheckCheck, Bell } from 'lucide-react'
import {
  Card, CardHeader, CardTitle, CardToolbar, CardContent, Button, Badge,
  EmptyState, ErrorState, SkeletonRow,
} from '../../components/ui'
import { useAlertStore } from '../../store/alertStore'
import { alertIcon, SEVERITY_BADGE } from '../../lib/alert-icons'
import { sinceLabel } from '../../lib/time'
import api from '../../lib/api'

export default function AlertsFeed({ loading, error, onRetry }) {
  const navigate = useNavigate()
  const alerts = useAlertStore(s => s.alerts)
  const unreadCount = useAlertStore(s => s.unreadCount)
  const markAllRead = useAlertStore(s => s.markAllRead)

  async function handleMarkAllRead() {
    markAllRead()
    try {
      await api.put('/alerts/read-all')
    } catch (err) {
      console.error(err.message)
    }
  }

  const visible = alerts.slice(0, 8)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent alerts</CardTitle>
        <CardToolbar>
          {unreadCount > 0 && (
            <Button variant='ghost' size='sm' iconLeft={CheckCheck} onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          )}
          <Button variant='ghost' size='sm' onClick={() => navigate('/alerts')}>View all</Button>
        </CardToolbar>
      </CardHeader>

      <CardContent className='pt-0'>
        {error ? (
          <ErrorState compact title="Couldn't load alerts" onRetry={onRetry} />
        ) : loading ? (
          <div className='space-y-0.5'>
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : visible.length === 0 ? (
          <EmptyState size='sm' icon={Bell} title='No recent alerts' description='Alerts will show up here as they happen.' />
        ) : (
          <ul className='divide-y divide-border -mx-5'>
            {visible.map(alert => {
              const Icon = alertIcon(alert.type)
              return (
                // Keyed on read status too so a socket-delivered alert (which prepends fresh) or
                // a mark-as-read transition both remount and replay the same one-shot highlight
                // LiveVehicleList's rows use.
                <li
                  key={`${alert.id}:${alert.read}`}
                  className='flex items-start gap-3 px-5 py-2.5 motion-safe:animate-[row-flash_1.2s_ease-out]'
                >
                  <span className='size-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0 mt-0.5'>
                    <Icon className='size-3.5 text-fg-muted' aria-hidden='true' />
                  </span>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <Badge variant={SEVERITY_BADGE[alert.severity] ?? 'info'} size='sm'>{alert.severity}</Badge>
                      {!alert.read && <span className='size-1.5 rounded-full bg-accent' aria-hidden='true' />}
                    </div>
                    <p className='text-sm text-fg mt-1 truncate'>{alert.message}</p>
                    <p className='text-xs text-fg-subtle mt-0.5'>
                      {sinceLabel(alert.createdAt ?? alert.timestamp)} ago
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
