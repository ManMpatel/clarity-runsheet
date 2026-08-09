import { useNavigate } from 'react-router-dom'
import { ChevronDown, Sun, Moon, Monitor, Settings as SettingsIcon, CreditCard, LogOut } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { useUiStore } from '../../store/uiStore'
import { destroySocket } from '../../lib/socket'
import api from '../../lib/api'
import Avatar from '../ui/Avatar'
import SegmentedControl from '../ui/SegmentedControl'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from '../ui/DropdownMenu'

const THEME_OPTIONS = [
  { value: 'light',  label: '', icon: Sun,     srLabel: 'Light' },
  { value: 'dark',   label: '', icon: Moon,    srLabel: 'Dark' },
  { value: 'system', label: '', icon: Monitor, srLabel: 'System' },
]

export default function UserMenu() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const theme = useUiStore(s => s.theme)
  const setTheme = useUiStore(s => s.setTheme)

  async function handleLogout() {
    try {
      await api.post('/auth/logout')
    } catch (err) {
      console.error(err.message)
    }
    destroySocket()
    logout()
    navigate('/login')
  }

  const name = user?.name || 'Account'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className='flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-control hover:bg-surface-2 transition-colors'
      >
        <Avatar name={name} size='sm' decorative />
        <span className='hidden lg:block text-sm font-medium text-fg max-w-32 truncate'>{name}</span>
        <ChevronDown className='size-3.5 text-fg-subtle hidden lg:block' aria-hidden='true' />
      </DropdownMenuTrigger>

      <DropdownMenuContent className='w-64'>
        <DropdownMenuLabel>
          <p className='text-sm font-semibold text-fg truncate'>{name}</p>
          {user?.email && <p className='text-xs text-fg-muted truncate mt-0.5'>{user.email}</p>}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <div className='px-2.5 py-2 flex items-center justify-between'>
          <span className='text-xs text-fg-muted'>Theme</span>
          <SegmentedControl label='Colour theme' size='sm' value={theme} onChange={setTheme} options={THEME_OPTIONS} />
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem icon={SettingsIcon} onSelect={() => navigate('/settings')}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem icon={CreditCard} onSelect={() => navigate('/billing')}>
          Billing
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem icon={LogOut} destructive onSelect={handleLogout}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
