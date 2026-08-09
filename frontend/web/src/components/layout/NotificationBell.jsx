import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck } from 'lucide-react'
import { useAlertStore } from '../../store/alertStore'
import api from '../../lib/api'
import { timeLabel } from '../../lib/time'
import { alertIcon, SEVERITY_BADGE } from '../../lib/alert-icons'
import Popover from '../ui/Popover'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { EmptyState } from '../ui'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
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

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      label='Notifications'
      className='w-80 max-h-[28rem] flex flex-col'
      trigger={
        <button
          type='button'
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
          className='relative size-9 rounded-control inline-flex items-center justify-center
                     text-fg-muted hover:bg-surface-2 hover:text-fg transition-colors outline-none
                     focus-visible:ring-2 focus-visible:ring-ring'
        >
          <Bell className='size-4.5' aria-hidden='true' />
          {unreadCount > 0 && (
            <span
              className='absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-white
                         text-[10px] font-bold flex items-center justify-center tabular'
              aria-hidden='true'
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      }
    >
      <div className='flex items-center justify-between px-3.5 py-3 border-b border-border shrink-0'>
        <p className='text-sm font-semibold text-fg'>Notifications</p>
        {unreadCount > 0 && (
          <Button variant='ghost' size='sm' iconLeft={CheckCheck} onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        )}
      </div>

      <div className='overflow-y-auto flex-1'>
        {alerts.length === 0 ? (
          <EmptyState icon={Bell} title='No notifications' description='New alerts will show up here.' size='sm' />
        ) : (
          <ul className='divide-y divide-border'>
            {alerts.slice(0, 5).map(alert => {
              const Icon = alertIcon(alert.type)
              return (
                <li key={alert.id} className='px-3.5 py-2.5 flex items-start gap-2.5'>
                  <span className='size-7 rounded-full bg-surface-2 flex items-center justify-center shrink-0 mt-0.5'>
                    <Icon className='size-3.5 text-fg-muted' aria-hidden='true' />
                  </span>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-1.5'>
                      <Badge variant={SEVERITY_BADGE[alert.severity] ?? 'info'} size='sm'>
                        {alert.severity}
                      </Badge>
                      {!alert.read && <span className='size-1.5 rounded-full bg-accent' aria-hidden='true' />}
                    </div>
                    <p className='text-xs text-fg mt-1 line-clamp-2'>{alert.message}</p>
                    <p className='text-[11px] text-fg-subtle mt-0.5'>{timeLabel(alert.createdAt ?? alert.timestamp)}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className='p-2 border-t border-border shrink-0'>
        <Button
          variant='ghost' size='sm' fullWidth
          onClick={() => { setOpen(false); navigate('/alerts') }}
        >
          View all alerts
        </Button>
      </div>
    </Popover>
  )
}
