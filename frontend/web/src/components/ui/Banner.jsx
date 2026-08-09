import { X } from 'lucide-react'
import { AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react'
import { cn } from '../../lib/cn'

const TONES = {
  info:    { wrap: 'bg-info-soft text-info-fg border-info/20',       icon: Info },
  success: { wrap: 'bg-success-soft text-success-fg border-success/20', icon: CheckCircle2 },
  warning: { wrap: 'bg-warning-soft text-warning-fg border-warning/20', icon: AlertTriangle },
  danger:  { wrap: 'bg-danger-soft text-danger-fg border-danger/20',  icon: AlertOctagon },
}

export default function Banner({
  tone = 'info', children, action, onDismiss, className,
}) {
  const { wrap, icon: Icon } = TONES[tone]

  return (
    <div
      // 'alert' interrupts; 'status' waits its turn. Only genuine failures deserve the interrupt.
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-center gap-3 px-4 sm:px-6 py-2.5 border-b text-sm', wrap, className)}
    >
      <Icon className='size-4 shrink-0' aria-hidden='true' />
      <div className='flex-1 min-w-0'>{children}</div>
      {action}
      {onDismiss && (
        <button
          type='button' onClick={onDismiss} aria-label='Dismiss'
          className='shrink-0 size-6 inline-flex items-center justify-center rounded transition-opacity
                     opacity-60 hover:opacity-100 outline-none focus-visible:ring-2 focus-visible:ring-current'
        >
          <X className='size-3.5' aria-hidden='true' />
        </button>
      )}
    </div>
  )
}
