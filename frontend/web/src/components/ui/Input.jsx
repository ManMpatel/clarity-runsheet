import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const base =
  'w-full bg-surface text-fg rounded-control border border-border placeholder:text-fg-subtle ' +
  'transition-colors outline-none focus-visible:border-accent focus-visible:ring-2 ' +
  'focus-visible:ring-ring/30 disabled:opacity-50 disabled:pointer-events-none ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus-visible:ring-danger/30'

const SIZES = { sm: 'h-8 px-2.5 text-xs', md: 'h-9 px-3 text-sm', lg: 'h-10 px-3.5 text-sm' }

const Input = forwardRef(function Input(
  { className, size = 'md', iconLeft: IconLeft, invalid, ...rest }, ref
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(base, SIZES[size], IconLeft && 'pl-9', className)}
      {...rest}
    />
  )

  if (!IconLeft) return input

  return (
    <div className='relative'>
      <IconLeft
        className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-fg-subtle pointer-events-none'
        aria-hidden='true'
      />
      {input}
    </div>
  )
})

export const Textarea = forwardRef(function Textarea({ className, invalid, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref} rows={rows} aria-invalid={invalid || undefined}
      className={cn(base, 'px-3 py-2 text-sm resize-y min-h-20', className)}
      {...rest}
    />
  )
})

export const Select = forwardRef(function Select({ className, size = 'md', invalid, children, ...rest }, ref) {
  return (
    <select
      ref={ref} aria-invalid={invalid || undefined}
      className={cn(base, SIZES[size], 'pr-8 cursor-pointer', className)}
      {...rest}
    >
      {children}
    </select>
  )
})

export default Input
