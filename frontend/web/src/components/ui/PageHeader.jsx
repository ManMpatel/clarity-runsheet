import { cn } from '../../lib/cn'

/**
 * Formalises the `<div className='p-6'><h1 className='text-2xl font-bold'>` + muted subtitle
 * pattern that every page re-typed by hand.
 */
export default function PageHeader({ title, description, actions, className, children }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className='min-w-0'>
        <h1 className='text-xl font-semibold text-fg tracking-tight'>{title}</h1>
        {description && <p className='text-sm text-fg-muted mt-1'>{description}</p>}
        {children}
      </div>
      {actions && <div className='flex flex-wrap items-center gap-2 shrink-0'>{actions}</div>}
    </div>
  )
}
