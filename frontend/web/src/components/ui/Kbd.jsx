import { cn } from '../../lib/cn'

export default function Kbd({ className, children, ...rest }) {
  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded',
        'border border-border bg-surface-2 text-fg-subtle',
        'text-[10px] font-medium font-sans leading-none',
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  )
}
