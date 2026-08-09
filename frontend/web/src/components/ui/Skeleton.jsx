import { cn } from '../../lib/cn'

export function Skeleton({ className, ...rest }) {
  return (
    <div
      className={cn('bg-surface-2 rounded-control motion-safe:animate-pulse', className)}
      aria-hidden='true'
      {...rest}
    />
  )
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden='true'>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonRow({ className }) {
  return (
    <div className={cn('flex items-center gap-3 py-2.5', className)} aria-hidden='true'>
      <Skeleton className='size-2 rounded-full' />
      <Skeleton className='h-3 w-32' />
      <Skeleton className='h-3 w-16 ml-auto' />
    </div>
  )
}

export function SkeletonCard({ className }) {
  return (
    <div className={cn('bg-surface border border-border rounded-card p-5', className)} aria-hidden='true'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='h-8 w-20 mt-3' />
    </div>
  )
}

/**
 * Wrap a skeleton tree in this so assistive tech announces the wait once, instead of the
 * individual bones being announced (or, more often, nothing at all being announced).
 */
export function SkeletonRegion({ label = 'Loading', className, children }) {
  return (
    <div role='status' aria-busy='true' className={className}>
      <span className='sr-only'>{label}</span>
      {children}
    </div>
  )
}

export default Skeleton
