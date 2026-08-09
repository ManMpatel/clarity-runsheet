import { Card, CardHeader, CardTitle, CardContent, Skeleton, SkeletonRow, SkeletonRegion } from '../../components/ui'

/** Mirrors the real dashboard grid exactly, so the loading -> loaded transition doesn't jump. */
export default function DashboardSkeleton() {
  return (
    <SkeletonRegion label='Loading dashboard' className='p-4 sm:p-6 space-y-5'>
      <div className='flex items-start justify-between gap-4'>
        <div>
          <Skeleton className='h-6 w-32' />
          <Skeleton className='h-4 w-48 mt-2' />
        </div>
        <Skeleton className='h-9 w-56' />
      </div>

      <div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4'>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className='bg-surface border border-border rounded-card p-5'>
            <Skeleton className='h-3 w-20' />
            <Skeleton className='h-7 w-14 mt-2.5' />
          </div>
        ))}
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
        <Card className='xl:col-span-2'>
          <CardHeader><CardTitle>Fleet activity</CardTitle></CardHeader>
          <CardContent className='pt-0'><Skeleton className='h-64 w-full' /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Status breakdown</CardTitle></CardHeader>
          <CardContent className='pt-0 flex justify-center'><Skeleton className='size-36 rounded-full' /></CardContent>
        </Card>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
        {[0, 1].map(i => (
          <Card key={i}>
            <CardHeader><CardTitle>{i === 0 ? 'Live vehicles' : 'Recent alerts'}</CardTitle></CardHeader>
            <CardContent className='pt-0 space-y-0.5'>
              {Array.from({ length: 6 }).map((_, j) => <SkeletonRow key={j} />)}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Needs attention</CardTitle></CardHeader>
        <CardContent className='pt-0 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className='space-y-2'>
              <Skeleton className='h-3 w-24' />
              <Skeleton className='h-3 w-full' />
              <Skeleton className='h-3 w-2/3' />
            </div>
          ))}
        </CardContent>
      </Card>
    </SkeletonRegion>
  )
}
