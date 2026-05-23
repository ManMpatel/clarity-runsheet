import { useEffect, useState } from 'react'
import api from '../../lib/api'

export default function AdminTickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/support/tickets')
        setTickets(res.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return <p className='text-sm text-gray-500 p-6'>Loading tickets...</p>

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-900 mb-2'>Support Tickets</h1>
      <p className='text-sm text-gray-500 mb-6'>{tickets.length} total tickets</p>

      {tickets.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-500'>No support tickets yet</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {tickets.map((t, i) => (
            <div key={i} className='bg-white rounded-xl border border-gray-200 p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-2 mb-1'>
                    <span className='text-xs font-mono text-purple-600'>{t.ticketNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      t.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {t.status}
                    </span>
                    {t.category && (
                      <span className='text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600'>
                        {t.category}
                      </span>
                    )}
                  </div>
                  <p className='text-sm font-semibold text-gray-800'>{t.subject}</p>
                  <p className='text-xs text-gray-500 mt-0.5'>{t.name} — {t.email}</p>
                  <p className='text-sm text-gray-600 mt-2 leading-relaxed'>{t.message}</p>
                </div>
                <span className='text-xs text-gray-400 whitespace-nowrap ml-4'>
                  {new Date(t.createdAt).toLocaleDateString('en-AU')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
