import { useUiStore } from '../../store/uiStore'

const TIMEZONES = [
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Brisbane',
  'Australia/Perth',
  'Australia/Adelaide',
  'Australia/Darwin',
  'Australia/Hobart',
]

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY — 23/05/2026' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY — 05/23/2026' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD — 2026-05-23' },
]

export default function AppearanceSection() {
  const { darkMode, toggleDarkMode } = useUiStore()
  const timezone   = localStorage.getItem('clarity-timezone')   || 'Australia/Sydney'
  const dateFormat = localStorage.getItem('clarity-dateformat') || 'DD/MM/YYYY'

  function setTimezone(v) { localStorage.setItem('clarity-timezone', v) }
  function setDateFormat(v) { localStorage.setItem('clarity-dateformat', v) }

  return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Appearance</h1>
      <p className='text-sm text-gray-500 mb-6'>Customise how Clarity Fleet looks and behaves</p>

      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
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

        <div className='px-6 py-4'>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>Timezone</p>
          <p className='text-xs text-gray-500 mb-2'>Used for trip times, alerts and reports</p>
          <select defaultValue={timezone} onChange={e => setTimezone(e.target.value)}
            className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none'>
            {TIMEZONES.map(tz => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>

        <div className='px-6 py-4'>
          <p className='text-sm font-medium text-gray-900 dark:text-white mb-1'>Date format</p>
          <p className='text-xs text-gray-500 mb-2'>How dates appear across the dashboard</p>
          <select defaultValue={dateFormat} onChange={e => setDateFormat(e.target.value)}
            className='w-full h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none'>
            {DATE_FORMATS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}