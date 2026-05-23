export default function ProfileSection({ me, loading }) {
  if (loading) return <p className='text-sm text-gray-400'>Loading...</p>
  if (!me) return null

  return (
    <div>
      <h1 className='text-xl font-bold text-gray-900 dark:text-white mb-1'>Profile</h1>
      <p className='text-sm text-gray-500 mb-6'>Your account information</p>
      <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800'>
        {[
          { label: 'Full name', value: me.name },
          { label: 'Role', value: me.role },
          { label: 'Member since', value: new Date(me.createdAt).toLocaleDateString('en-AU') },
        ].map(row => (
          <div key={row.label} className='px-6 py-4'>
            <p className='text-xs text-gray-500 mb-0.5'>{row.label}</p>
            <p className='text-sm font-medium text-gray-900 dark:text-white capitalize'>{row.value}</p>
          </div>
        ))}
        <div className='px-6 py-4 flex items-center justify-between'>
          <div>
            <p className='text-xs text-gray-500 mb-0.5'>Email address</p>
            <p className='text-sm font-medium text-gray-900 dark:text-white'>{me.email}</p>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            me.emailVerified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {me.emailVerified ? 'Verified' : 'Not verified'}
          </span>
        </div>
      </div>
    </div>
  )
}