import { cn } from '../../lib/cn'

export default function Separator({ orientation = 'horizontal', label, className, ...rest }) {
  if (label) {
    return (
      <div className={cn('flex items-center gap-2', className)} {...rest}>
        <span className='text-[11px] font-semibold text-fg-subtle uppercase tracking-wider whitespace-nowrap'>
          {label}
        </span>
        <span className='flex-1 h-px bg-border' aria-hidden='true' />
      </div>
    )
  }

  return (
    <div
      // Purely visual dividers are noise in the accessibility tree; only labelled ones get a role.
      aria-hidden='true'
      className={cn(orientation === 'vertical' ? 'w-px self-stretch' : 'h-px w-full', 'bg-border', className)}
      {...rest}
    />
  )
}
