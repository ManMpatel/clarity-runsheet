import { ResponsiveContainer } from 'recharts'
import { cn } from '../../lib/cn'

/**
 * A chart is an <img> as far as assistive tech is concerned — recharts renders an SVG soup of
 * paths that reads as nothing. `summary` is the alt text: state the trend in words. `table` takes
 * an optional visually-hidden data table for anyone who wants the actual numbers.
 */
export default function ChartContainer({
  height = 240, summary, table, className, children,
}) {
  return (
    <figure className={cn('w-full', className)}>
      <div role='img' aria-label={summary} style={{ height }}>
        <ResponsiveContainer width='100%' height='100%'>
          {children}
        </ResponsiveContainer>
      </div>
      {table && <div className='sr-only'>{table}</div>}
      {summary && <figcaption className='sr-only'>{summary}</figcaption>}
    </figure>
  )
}
