import { useUiStore } from '../../store/uiStore'
import { useAuthStore } from '../../store/authStore'
import { useNavigate } from 'react-router-dom'

export default function Header() {
  const { darkMode, toggleDarkMode } = useUiStore()
  const logout = useAuthStore(s => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className='md:ml-60 h-[60px] fixed top-0 right-0 left-0 md:left-60 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30 flex items-center justify-between px-6'>
      <span className='text-sm font-medium text-gray-500 dark:text-gray-400 md:hidden'>
        Clarity Fleet
      </span>
      <div className='flex items-center gap-4 ml-auto'>
        <button
          onClick={toggleDarkMode}
          className='text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
        >
          {darkMode ? 'Light' : 'Dark'}
        </button>
        <button
          onClick={handleLogout}
          className='text-sm text-gray-500 dark:text-gray-400 hover:text-red-500'
        >
          Logout
        </button>
      </div>
    </header>
  )
}