import { cn } from '../../lib/cn'

/**
 * Pass as recharts' `content={<ChartTooltip .../>}`. Recharts injects active/payload/label.
 * `format` maps a series key to a display string.
 */
export default function ChartTooltip({ active, payload, label, labelFormatter, format, className }) {
  if (!active || !payload?.length) return null

  return (
    <div className={cn(
      'rounded-control border border-border bg-surface shadow-popover px-3 py-2 min-w-36',
      className
    )}>
      <p className='text-[11px] font-medium text-fg-subtle mb-1.5'>
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      <div className='space-y-1'>
        {payload.map(entry => (
          <div key={entry.dataKey} className='flex items-center justify-between gap-4'>
            <span className='flex items-center gap-1.5 text-xs text-fg-muted'>
              <span className='size-2 rounded-full shrink-0' style={{ background: entry.color }} aria-hidden='true' />
              {entry.name}
            </span>
            <span className='text-xs font-semibold text-fg tabular'>
              {format ? format(entry.value, entry.dataKey) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
