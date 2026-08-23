import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'
import Spinner from './Spinner'

// Heights are fixed at sm/md/lg here on purpose. Before this component the codebase had h-9, h-10
// and h-11 primary buttons on different pages with otherwise identical styling.
const button = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-control font-semibold ' +
    'transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-ring ' +
    'focus-visible:ring-offset-2 focus-visible:ring-offset-canvas ' +
    'active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:   'bg-accent text-fg-on-accent hover:bg-accent-hover shadow-sm',
        secondary: 'bg-surface text-fg border border-border hover:bg-surface-2 shadow-xs',
        outline:   'border border-border-strong text-fg hover:bg-surface-2',
        ghost:     'text-fg-muted hover:bg-surface-2 hover:text-fg',
        danger:    'bg-danger text-white hover:brightness-110 shadow-sm',
        link:      'text-accent hover:underline underline-offset-4 h-auto p-0',
      },
      size: {
        sm:   'h-9 px-3.5 text-xs',
        md:   'h-10 px-4 text-sm',
        lg:   'h-11 px-5 text-[15px]',
        icon: 'h-10 w-10 p-0',
      },
      fullWidth: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

const Button = forwardRef(function Button(
  {
    className, variant, size, fullWidth,
    loading = false, disabled = false,
    iconLeft: IconLeft, iconRight: IconRight,
    as: Comp = 'button', children, ...rest
  },
  ref
) {
  if (import.meta.env.DEV && size === 'icon' && !rest['aria-label'] && !children) {
    console.warn('[Button] size="icon" with no children needs an aria-label.')
  }

  const isNative = Comp === 'button'

  return (
    <Comp
      ref={ref}
      // `type` is only meaningful on a real <button>; setting it on an <a> is invalid HTML.
      {...(isNative ? { type: rest.type ?? 'button', disabled: disabled || loading } : {})}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading
        ? <Spinner size='sm' aria-hidden='true' />
        : IconLeft && <IconLeft className='size-4 shrink-0' aria-hidden='true' />}
      {/* The label stays mounted while loading so the button doesn't change width mid-click. */}
      {children}
      {!loading && IconRight && <IconRight className='size-4 shrink-0' aria-hidden='true' />}
    </Comp>
  )
})

export default Button
