import { AlertTriangle, RotateCw } from 'lucide-react'
import { cn } from '../../lib/cn'
import Button from './Button'

export default function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  compact = false,
  className,
}) {
  return (
    // role='alert' so a failure that appears after load is announced rather than sitting silently.
    <div
      role='alert'
      className={cn(
        'flex flex-col items-center justify-center text-center px-6',
        compact ? 'py-6' : 'py-12',
        className
      )}
    >
      <div className='size-10 rounded-full bg-danger-soft text-danger-fg flex items-center justify-center mb-3'>
        <AlertTriangle className='size-5' aria-hidden='true' />
      </div>
      <p className={cn('font-semibold text-fg', compact ? 'text-sm' : 'text-base')}>{title}</p>
      {message && <p className='text-xs text-fg-muted max-w-sm mt-1.5'>{message}</p>}
      {onRetry && (
        <Button variant='secondary' size='sm' className='mt-4' onClick={onRetry} iconLeft={RotateCw}>
          Try again
        </Button>
      )}
    </div>
  )
}
