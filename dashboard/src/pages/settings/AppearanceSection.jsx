import { useUiStore } from '../../store/uiStore'

export default function AppearanceSection() {
  const { darkMode, toggleDarkMode } = useUiStore()

  return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Appearance</h1>
      <p className='text-sm text-gray-500 mb-6'>Customise how Clarity Fleet looks</p>
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800'>
        <div className='px-6 py-4 flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium text-gray-900 dark:text-white'>Dark mode</p>
            <p className='text-xs text-gray-500 mt-0.5'>Switch between light and dark theme</p>
          </div>
          <button onClick={toggleDarkMode}
            className={`relative w-11 h-6 rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}