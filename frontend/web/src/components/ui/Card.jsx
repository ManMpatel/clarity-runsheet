import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const card = cva(
  'bg-surface border border-border rounded-card shadow-card',
  {
    variants: {
      padding: { none: '', sm: 'p-4', md: 'p-5' },
      interactive: {
        true: 'text-left w-full transition-colors hover:border-border-strong hover:bg-surface-2 ' +
              'outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
              'focus-visible:ring-offset-canvas',
      },
    },
    defaultVariants: { padding: 'none' },
  }
)

/**
 * `interactive` renders a real <button> (or <a> via `as`) rather than a div with onClick, so the
 * card is reachable by keyboard and announced as actionable.
 */
export const Card = forwardRef(function Card(
  { className, padding, interactive, as, children, ...rest }, ref
) {
  const Comp = as || (interactive ? 'button' : 'div')
  return (
    <Comp
      ref={ref}
      {...(Comp === 'button' ? { type: 'button' } : {})}
      className={cn(card({ padding, interactive }), className)}
      {...rest}
    >
      {children}
    </Comp>
  )
})

export function CardHeader({ className, children, ...rest }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5 pb-3', className)} {...rest}>
      {children}
    </div>
  )
}

/** `as` exists so pages can keep a legal heading order — a card inside an <h1> page is an h2. */
export function CardTitle({ as: Comp = 'h2', className, children, ...rest }) {
  return (
    <Comp className={cn('text-sm font-semibold text-fg', className)} {...rest}>
      {children}
    </Comp>
  )
}

export function CardDescription({ className, children, ...rest }) {
  return (
    <p className={cn('text-xs text-fg-muted mt-1', className)} {...rest}>{children}</p>
  )
}

export function CardToolbar({ className, children, ...rest }) {
  return (
    <div className={cn('flex items-center gap-2 shrink-0', className)} {...rest}>{children}</div>
  )
}

export function CardContent({ className, children, ...rest }) {
  return <div className={cn('px-5 pb-5', className)} {...rest}>{children}</div>
}

export function CardFooter({ className, children, ...rest }) {
  return (
    <div className={cn('flex items-center gap-2 px-5 py-3 border-t border-border', className)} {...rest}>
      {children}
    </div>
  )
}

export default Card
