import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { TrendingUp } from 'lucide-react'
import ChartContainer from '../../components/charts/ChartContainer'
import ChartTooltip from '../../components/charts/ChartTooltip'
import { axisProps, gridProps, cursorProps, compactNumber, shortDate } from '../../components/charts/chart-theme'
import { EmptyState } from '../../components/ui'
import { formatKm } from '../../lib/time'

// Lazy-loaded from Dashboard.jsx (React.lazy) — recharts is ~100KB gzip and has no business in
// the shell's entry bundle.
export default function FleetActivityChart({ trend = [] }) {
  const allZero = trend.every(d => d.km === 0 && d.trips === 0)

  if (allZero) {
    return (
      <EmptyState
        size='sm' icon={TrendingUp} title='No activity yet'
        description='Trip distance and counts will appear here once vehicles start driving.'
      />
    )
  }

  return (
    <ChartContainer
      height={260}
      summary={`Daily distance and trip count over the last ${trend.length} days`}
    >
      <ComposedChart data={trend} margin={{ left: 0, right: 4, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id='dashboardKmFill' x1='0' y1='0' x2='0' y2='1'>
            <stop offset='0%' stopColor='var(--accent)' stopOpacity={0.28} />
            <stop offset='100%' stopColor='var(--accent)' stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey='date' tickFormatter={shortDate} tickMargin={8} {...axisProps} />
        <YAxis yAxisId='km' tickFormatter={compactNumber} width={36} {...axisProps} />
        <YAxis yAxisId='trips' orientation='right' tickFormatter={compactNumber} width={28} {...axisProps} />
        <Tooltip
          cursor={cursorProps}
          content={
            <ChartTooltip
              labelFormatter={shortDate}
              format={(value, key) => (key === 'km' ? `${formatKm(value, 1)} km` : `${value} trips`)}
            />
          }
        />
        <Area
          yAxisId='km' type='monotone' dataKey='km' name='Distance'
          stroke='var(--accent)' fill='url(#dashboardKmFill)' strokeWidth={2}
        />
        <Line
          yAxisId='trips' type='monotone' dataKey='trips' name='Trips'
          stroke='var(--info)' strokeWidth={2} dot={false} strokeDasharray='4 3'
        />
      </ComposedChart>
    </ChartContainer>
  )
}
