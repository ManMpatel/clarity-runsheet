import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/support/tickets')
      .then(res => setTickets(res.data))
      .catch(err => console.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  function statusColor(status) {
    if (status === 'open')   return 'bg-amber-100 text-amber-700'
    if (status === 'closed') return 'bg-green-100 text-green-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Support Tickets</h1>
        <p className='text-sm text-gray-500 mt-1'>{tickets.length} total tickets</p>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 overflow-hidden'>
        {loading ? (
          <p className='text-sm text-gray-400 p-6'>Loading...</p>
        ) : tickets.length === 0 ? (
          <p className='text-sm text-gray-400 p-6'>No support tickets yet</p>
        ) : (
          <div className='divide-y divide-gray-100'>
            {tickets.map((t, i) => (
              <div key={i} className='px-5 py-4'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <span className='text-xs font-mono font-medium text-purple-600'>
                        #{t.ticketNumber}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                      {t.category && (
                        <span className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500'>
                          {t.category}
                        </span>
                      )}
                    </div>
                    <p className='text-sm font-semibold text-gray-800'>{t.subject}</p>
                    <p className='text-xs text-gray-500 mt-0.5'>{t.name} — {t.email}</p>
                    <p className='text-sm text-gray-600 mt-2 line-clamp-2'>{t.message}</p>
                  </div>
                  <p className='text-xs text-gray-400 shrink-0'>
                    {new Date(t.createdAt).toLocaleDateString('en-AU')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}