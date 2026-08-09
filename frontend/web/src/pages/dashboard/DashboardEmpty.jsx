import { useNavigate } from 'react-router-dom'
import { Truck, ScanLine, Spline } from 'lucide-react'
import { Button, Badge, Card, Spinner, EmptyState, Skeleton } from '../../components/ui'
import { cn } from '../../lib/cn'

const STEPS = [
  { title: 'Register vehicle & IMEI', description: 'Add a vehicle and pair it with a Clarity tracker.' },
  { title: 'Install the device', description: 'Fit the tracker so it has clear power and GPS visibility.' },
  { title: 'Watch data arrive live', description: 'Location, trips and alerts appear here automatically.' },
]

function Checklist({ activeStep }) {
  return (
    <Card padding='md'>
      <ol className='space-y-4'>
        {STEPS.map((step, i) => {
          const num = i + 1
          const active = num === activeStep
          const done = num < activeStep
          return (
            <li key={step.title} className='flex items-start gap-3'>
              <span
                className={cn(
                  'size-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5',
                  done ? 'bg-success-soft text-success-fg' : active ? 'bg-accent text-fg-on-accent' : 'bg-surface-2 text-fg-subtle'
                )}
              >
                {done ? '✓' : num}
              </span>
              <div>
                <p className={cn('text-sm font-medium', active ? 'text-fg' : 'text-fg-muted')}>{step.title}</p>
                <p className='text-xs text-fg-subtle mt-0.5'>{step.description}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}

/** A dimmed, non-interactive preview of the real layout — shows what's coming without faking data. */
function DashboardPreview() {
  return (
    <div className='relative mt-8'>
      <div className='absolute -top-3 left-1/2 -translate-x-1/2 z-10'>
        <Badge variant='accent'>Preview</Badge>
      </div>
      <div aria-hidden='true' className='opacity-40 pointer-events-none select-none space-y-4 rounded-card border border-dashed border-border p-4'>
        <div className='grid grid-cols-2 lg:grid-cols-5 gap-3'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='bg-surface border border-border rounded-card p-4'>
              <Skeleton className='h-2.5 w-14' />
              <Skeleton className='h-5 w-10 mt-2' />
            </div>
          ))}
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-3'>
          <div className='lg:col-span-2 bg-surface border border-border rounded-card p-4'>
            <Skeleton className='h-40 w-full' />
          </div>
          <div className='bg-surface border border-border rounded-card p-4 flex items-center justify-center'>
            <Skeleton className='size-24 rounded-full' />
          </div>
        </div>
      </div>
    </div>
  )
}

function NoVehicles() {
  const navigate = useNavigate()
  return (
    <div className='p-4 sm:p-6'>
      <Card padding='md'>
        <EmptyState
          size='lg' icon={Truck} tone='accent'
          title='Add your first vehicle'
          description='Register a vehicle and its Clarity tracker IMEI to start seeing live location, trips and alerts.'
          action={<Button onClick={() => navigate('/settings?tab=vehicles')}>Add vehicle</Button>}
          secondaryAction={<Button variant='secondary' iconLeft={ScanLine} onClick={() => navigate('/garage/imei-check')}>Check an IMEI</Button>}
        />
      </Card>
      <div className='max-w-md mx-auto mt-6'>
        <Checklist activeStep={1} />
      </div>
      <div className='max-w-3xl mx-auto'>
        <DashboardPreview />
      </div>
    </div>
  )
}

function NeverReported({ attention }) {
  const navigate = useNavigate()
  const vehicles = attention?.neverReportedVehicles ?? []

  return (
    <div className='p-4 sm:p-6 max-w-lg mx-auto'>
      <Card padding='md'>
        <div className='flex flex-col items-center text-center'>
          <Spinner size='lg' className='text-accent mb-4' />
          <h2 className='text-base font-semibold text-fg'>
            Waiting for the first report from {vehicles.length || 'your'} device{vehicles.length === 1 ? '' : 's'}
          </h2>
          <p className='text-sm text-fg-muted mt-1.5 max-w-sm'>
            This updates automatically the moment your tracker sends its first signal — no need to refresh.
          </p>
        </div>

        {vehicles.length > 0 && (
          <ul className='mt-6 divide-y divide-border -mx-5 -mb-5'>
            {vehicles.map(v => (
              <li key={v.vehicleId} className='flex items-center justify-between px-5 py-2.5 text-sm gap-3'>
                <div className='min-w-0'>
                  <p className='text-fg truncate'>{v.name}</p>
                  <p className='text-fg-subtle text-xs font-mono truncate'>{v.imei}</p>
                </div>
                <span className='text-fg-subtle text-xs shrink-0'>Never reported</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className='flex justify-center mt-4'>
        <Button variant='secondary' size='sm' iconLeft={Spline} onClick={() => navigate('/garage/imei-check')}>
          Troubleshoot with IMEI check
        </Button>
      </div>
    </div>
  )
}

export default function DashboardEmpty({ variant, attention }) {
  return variant === 'never-reported' ? <NeverReported attention={attention} /> : <NoVehicles />
}
