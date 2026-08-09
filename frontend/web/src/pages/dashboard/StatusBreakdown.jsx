import { PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent, Skeleton, StatusDot } from '../../components/ui'
import ChartContainer from '../../components/charts/ChartContainer'
import { STATUS_COLORS } from '../../components/charts/chart-theme'
import { STATUS_LABELS } from '../../lib/fleet-status'

const ORDER = ['moving', 'idle', 'stopped', 'offline']

export default function StatusBreakdown({ status, loading }) {
  const navigate = useNavigate()
  const total = ORDER.reduce((sum, key) => sum + (status?.[key] ?? 0), 0)
  const data = ORDER.map(key => ({ key, value: status?.[key] ?? 0 }))

  return (
    <Card>
      <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
      <CardContent className='pt-0'>
        {loading ? (
          <div className='flex flex-col items-center py-4'>
            <Skeleton className='size-36 rounded-full' />
          </div>
        ) : total === 0 ? (
          <p className='text-sm text-fg-muted text-center py-10'>No vehicles reporting yet.</p>
        ) : (
          <div className='relative'>
            <ChartContainer
              height={180}
              summary={`Fleet status: ${ORDER.map(k => `${status?.[k] ?? 0} ${STATUS_LABELS[k]}`).join(', ')}`}
            >
              <PieChart>
                {/* isAnimationActive=false: this widget refetches on a 60s poll and on every
                    socket van:update, so a multi-hundred-ms entrance sweep would replay on every
                    refresh — and a screenshot or fast paint taken mid-sweep renders as a
                    half-drawn arc instead of a full ring. A static donut that snaps to new values
                    is the right call for a live-updating monitor, not just a robustness fix. */}
                <Pie
                  data={data} dataKey='value' nameKey='key'
                  innerRadius='68%' outerRadius='100%' paddingAngle={2} stroke='none'
                  isAnimationActive={false}
                >
                  {data.map(d => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)}
                </Pie>
              </PieChart>
            </ChartContainer>
            <div className='absolute inset-0 flex flex-col items-center justify-center pointer-events-none'>
              <span className='text-2xl font-semibold text-fg tabular'>{total}</span>
              <span className='text-[11px] text-fg-subtle'>reporting</span>
            </div>
          </div>
        )}

        {!loading && (
          <ul className='mt-3 space-y-0.5'>
            {ORDER.map(key => (
              <li key={key}>
                <button
                  type='button'
                  onClick={() => navigate(`/live-map?status=${key}`)}
                  className='w-full flex items-center justify-between px-2 py-1.5 rounded-control
                             hover:bg-surface-2 transition-colors text-sm outline-none
                             focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <span className='flex items-center gap-2 text-fg-muted'>
                    <StatusDot status={key} /> {STATUS_LABELS[key]}
                  </span>
                  <span className='font-medium text-fg tabular'>{status?.[key] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
