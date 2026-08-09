import { cva } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-surface-2 text-fg-muted',
        accent:  'bg-accent-soft text-accent-fg',
        success: 'bg-success-soft text-success-fg',
        warning: 'bg-warning-soft text-warning-fg',
        danger:  'bg-danger-soft text-danger-fg',
        info:    'bg-info-soft text-info-fg',
        moving:  'bg-success-soft text-success-fg',
        idle:    'bg-warning-soft text-warning-fg',
        stopped: 'bg-surface-2 text-fg-muted',
        offline: 'bg-surface-2 text-offline',
        outline: 'border border-border text-fg-muted',
      },
      size: {
        sm: 'text-[11px] px-2 py-0.5',
        md: 'text-xs px-2.5 py-1',
      },
    },
    defaultVariants: { variant: 'neutral', size: 'sm' },
  }
)

const DOT_TONE = {
  moving: 'bg-moving', idle: 'bg-idle', stopped: 'bg-stopped', offline: 'bg-offline',
  success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger', info: 'bg-info',
  accent: 'bg-accent', neutral: 'bg-fg-subtle', outline: 'bg-fg-subtle',
}

/**
 * Always renders its text. Colour is never the only channel carrying meaning here — a red pill
 * with no label is invisible to anyone who can't distinguish it from the amber one.
 */
export default function Badge({ variant = 'neutral', size, dot = false, className, children, ...rest }) {
  return (
    <span className={cn(badge({ variant, size }), className)} {...rest}>
      {dot && <span className={cn('size-1.5 rounded-full shrink-0', DOT_TONE[variant])} aria-hidden='true' />}
      {children}
    </span>
  )
}
