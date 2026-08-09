import { cn } from '../../lib/cn'

const TONES = {
  accent: 'bg-accent', success: 'bg-success', warning: 'bg-warning',
  danger: 'bg-danger', info: 'bg-info',
  moving: 'bg-moving', idle: 'bg-idle', stopped: 'bg-stopped', offline: 'bg-offline',
}
const SIZES = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' }

export default function Progress({
  value = 0, max = 100, tone = 'accent', size = 'md', label, className,
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <div
      role='progressbar'
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className={cn('w-full rounded-full bg-surface-3 overflow-hidden', SIZES[size], className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500 ease-out', TONES[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
