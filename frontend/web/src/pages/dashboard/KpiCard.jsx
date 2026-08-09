import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Card, Skeleton } from '../../components/ui'
import { cn } from '../../lib/cn'

function DeltaChip({ delta, invert }) {
  if (delta == null || Number.isNaN(delta)) return null
  const isFlat = Math.abs(delta) < 0.005
  const positive = delta > 0
  // "good" tracks whether the change is desirable, not its raw sign — a rise in open alerts is
  // bad, a rise in distance driven is good. `invert` flips which direction counts as good.
  const good = isFlat ? null : invert ? !positive : positive
  const Icon = positive ? TrendingUp : TrendingDown
  const pct = Math.round(Math.abs(delta) * 100)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium tabular',
        isFlat ? 'text-fg-subtle' : good ? 'text-success-fg' : 'text-danger-fg'
      )}
    >
      {!isFlat && <Icon className='size-3' aria-hidden='true' />}
      {isFlat ? 'No change' : `${positive ? '+' : '-'}${pct}%`}
      <span className='sr-only'>vs yesterday</span>
    </span>
  )
}

export default function KpiCard({
  label, value, unit, delta, invert = false, secondary, icon: Icon, tone = 'neutral', to, loading,
}) {
  const linkProps = to ? { as: Link, to, interactive: true } : {}

  return (
    <Card padding='md' className='block' {...linkProps}>
      <div className='flex items-start justify-between gap-2'>
        <p className='text-xs font-medium text-fg-muted'>{label}</p>
        {Icon && (
          <Icon
            className={cn('size-4 shrink-0', tone === 'danger' ? 'text-danger-fg' : 'text-fg-subtle')}
            aria-hidden='true'
          />
        )}
      </div>

      {loading ? (
        <Skeleton className='h-7 w-16 mt-2' />
      ) : (
        <p className='text-2xl font-semibold text-fg mt-1.5 tabular'>
          {value}
          {unit && <span className='text-sm font-normal text-fg-muted ml-1'>{unit}</span>}
        </p>
      )}

      {!loading && (delta != null || secondary) && (
        <div className='flex items-center gap-2 mt-1.5 min-h-4'>
          <DeltaChip delta={delta} invert={invert} />
          {secondary && <p className='text-xs text-fg-subtle truncate'>{secondary}</p>}
        </div>
      )}
    </Card>
  )
}
