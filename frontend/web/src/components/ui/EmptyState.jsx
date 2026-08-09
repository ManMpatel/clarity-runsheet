import { cn } from '../../lib/cn'

const SIZES = {
  sm: { wrap: 'py-8',  icon: 'size-10', glyph: 'size-5', title: 'text-sm',  body: 'text-xs' },
  md: { wrap: 'py-12', icon: 'size-12', glyph: 'size-6', title: 'text-base', body: 'text-sm' },
  lg: { wrap: 'py-16', icon: 'size-16', glyph: 'size-8', title: 'text-lg',  body: 'text-sm' },
}

const TONES = {
  neutral: 'bg-surface-2 text-fg-subtle',
  accent:  'bg-accent-soft text-accent-fg',
  success: 'bg-success-soft text-success-fg',
  warning: 'bg-warning-soft text-warning-fg',
}

export default function EmptyState({
  icon: Icon, title, description, action, secondaryAction,
  size = 'md', tone = 'neutral', className, titleAs: TitleTag = 'p',
}) {
  const s = SIZES[size]

  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6', s.wrap, className)}>
      {Icon && (
        <div className={cn('rounded-full flex items-center justify-center mb-4', s.icon, TONES[tone])}>
          <Icon className={s.glyph} aria-hidden='true' />
        </div>
      )}
      {title && <TitleTag className={cn('font-semibold text-fg', s.title)}>{title}</TitleTag>}
      {description && (
        <p className={cn('text-fg-muted max-w-sm mt-1.5', s.body)}>{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className='flex flex-wrap items-center justify-center gap-2 mt-5'>
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
