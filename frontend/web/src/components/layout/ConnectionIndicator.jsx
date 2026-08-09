import { useFleetSocket } from '../../hooks/useSocket'
import StatusDot from '../ui/StatusDot'
import { STATUS_LABELS } from '../../lib/fleet-status'

const DOT_STATUS = { connected: 'online', connecting: 'connecting', disconnected: 'disconnected' }

/**
 * Surfaces the same ref-counted socket connection every realtime consumer shares (lib/socket.js).
 * aria-live so a drop is announced once rather than needing to be noticed visually.
 */
export default function ConnectionIndicator() {
  const status = useFleetSocket({})

  return (
    <div
      className='hidden lg:flex items-center gap-1.5 text-xs text-fg-muted px-2'
      aria-live='polite'
    >
      <StatusDot status={DOT_STATUS[status]} pulse={status === 'connecting'} />
      <span>{STATUS_LABELS[DOT_STATUS[status]]}</span>
    </div>
  )
}
