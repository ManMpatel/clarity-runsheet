import { NavLink, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { cn } from '../../lib/cn'
import Tooltip from '../ui/Tooltip'
import Badge from '../ui/Badge'

const TIER_NAMES = { mid: 'Mid', top: 'Top' }

const baseRow =
  'group relative flex items-center gap-3 mx-2 px-3 h-10 rounded-lg text-sm font-medium ' +
  'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * One component for every nav row — sidebar, mobile drawer and (with labels hidden) the collapsed
 * rail. The superAdmin entry used to be a separate purple `border-l-4` treatment; it now uses this
 * same row with a trailing badge, so there is a single active state in the whole app.
 */
export default function NavItem({
  to, label, icon: Icon, badge, adminBadge, locked, lockedTier,
  collapsed = false, onNavigate,
}) {
  const navigate = useNavigate()

  if (locked) {
    return (
      <Tooltip
        side='right'
        content={`Requires ${TIER_NAMES[lockedTier] ?? lockedTier} plan — click to upgrade`}
      >
        <button
          type='button'
          onClick={() => { navigate('/billing'); onNavigate?.() }}
          className={cn(baseRow, 'w-[calc(100%-1rem)] text-fg-subtle hover:bg-surface-2', collapsed && 'justify-center px-0 mx-2')}
        >
          {Icon && <Icon className='size-4.5 shrink-0' aria-hidden='true' />}
          {!collapsed && (
            <>
              <span className='flex-1 text-left truncate'>{label}</span>
              <Lock className='size-3.5 shrink-0' aria-hidden='true' />
            </>
          )}
          <span className='sr-only'>
            {label} — requires {TIER_NAMES[lockedTier] ?? lockedTier} plan
          </span>
        </button>
      </Tooltip>
    )
  }

  const row = (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          baseRow,
          collapsed && 'justify-center px-0',
          isActive
            ? 'bg-accent-soft text-accent-fg'
            : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Active marker doubles the signal so selection isn't carried by colour alone. */}
          <span
            aria-hidden='true'
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full transition-opacity',
              isActive ? 'bg-accent opacity-100' : 'opacity-0'
            )}
          />
          {Icon && <Icon className='size-4.5 shrink-0' aria-hidden='true' />}
          {!collapsed && <span className='flex-1 truncate'>{label}</span>}
          {!collapsed && badge > 0 && (
            <Badge variant='danger' size='sm' className='tabular'>{badge > 99 ? '99+' : badge}</Badge>
          )}
          {!collapsed && adminBadge && <Badge variant='accent' size='sm'>Admin</Badge>}
          {collapsed && (badge > 0 || adminBadge) && (
            <span className='absolute top-1.5 right-2 size-1.5 rounded-full bg-danger' aria-hidden='true' />
          )}
          {collapsed && <span className='sr-only'>{label}</span>}
        </>
      )}
    </NavLink>
  )

  // Collapsed rail shows icons only, so the label has to come from somewhere.
  return collapsed ? <Tooltip side='right' content={label}>{row}</Tooltip> : row
}
