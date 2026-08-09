import { cn } from '../../lib/cn'
import { STATUS_LABELS } from '../../lib/fleet-status'

const TONE = {
  moving:  'bg-moving',
  idle:    'bg-idle',
  stopped: 'bg-stopped',
  offline: 'bg-offline',
  online:  'bg-success',
  connecting: 'bg-warning',
  disconnected: 'bg-fg-subtle',
}

const SIZES = { sm: 'size-1.5', md: 'size-2', lg: 'size-2.5' }

export default function StatusDot({ status = 'stopped', size = 'md', pulse = false, className, ...rest }) {
  const label = STATUS_LABELS[status] ?? status

  return (
    <span className={cn('relative inline-flex shrink-0', SIZES[size], className)}
          role='img' aria-label={label} {...rest}>
      {pulse && (
        <span className={cn('absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping', TONE[status])}
              aria-hidden='true' />
      )}
      <span className={cn('relative inline-flex rounded-full size-full', TONE[status])} aria-hidden='true' />
    </span>
  )
}
