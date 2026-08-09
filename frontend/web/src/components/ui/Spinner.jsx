import { cn } from '../../lib/cn'

const SIZES = { xs: 'size-3', sm: 'size-4', md: 'size-5', lg: 'size-8' }

/**
 * Pass aria-hidden when this sits inside an already-labelled control (a loading Button), so the
 * button's own text isn't competing with a second "Loading" announcement.
 */
export default function Spinner({ size = 'md', className, label = 'Loading', ...rest }) {
  const hidden = rest['aria-hidden'] === 'true' || rest['aria-hidden'] === true

  return (
    <svg
      className={cn('motion-safe:animate-spin text-current shrink-0', SIZES[size], className)}
      viewBox='0 0 24 24' fill='none'
      role={hidden ? undefined : 'status'}
      aria-label={hidden ? undefined : label}
      {...rest}
    >
      <circle cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='3' className='opacity-20' />
      <path
        d='M12 2a10 10 0 0 1 10 10'
        stroke='currentColor' strokeWidth='3' strokeLinecap='round'
      />
    </svg>
  )
}
