import { useEffect, useState } from 'react'
import api from '../lib/api'

export default function DriverBehaviour() {
  const [drivers, setDrivers]   = useState([])
  const [scores, setScores]     = useState({})
  const [selected, setSelected] = useState(null)
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/drivers')
        setDrivers(res.data)
        await loadScores(res.data)
      } catch (err) {
        console.error(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function loadScores(driverList) {
    const results = {}
    await Promise.all(
      driverList.map(async (d) => {
        try {
          const res = await api.get(`/drivers/${d.id}/score`)
          results[d.id] = res.data
        } catch {
          results[d.id] = []
        }
      })
    )
    setScores(results)
  }

  async function selectDriver(driver) {
    setSelected(driver)
    try {
      const res = await api.get(`/drivers/${driver.id}/score`)
      setHistory(res.data)
    } catch (err) {
      setHistory([])
    }
  }

  function latestScore(driverId) {
    const s = scores[driverId]
    if (!s || s.length === 0) return null
    return s[0]
  }

  function scoreColor(score) {
    if (!score) return 'text-gray-400'
    if (score >= 90) return 'text-teal-600'
    if (score >= 75) return 'text-amber-500'
    return 'text-red-500'
  }

  function scoreBg(score) {
    if (!score) return 'bg-gray-100'
    if (score >= 90) return 'bg-teal-50'
    if (score >= 75) return 'bg-amber-50'
    return 'bg-red-50'
  }

  return (
    <div className='p-6'>

      <div className='mb-6'>
        <h1 className='text-2xl font-bold text-gray-900'>Driver Behaviour</h1>
        <p className='text-sm text-gray-500 mt-1'>
          Safety scores and driving event history
        </p>
      </div>

      {loading ? (
        <p className='text-sm text-gray-400'>Loading drivers...</p>
      ) : drivers.length === 0 ? (
        <div className='bg-white rounded-xl border border-gray-200 p-8 text-center'>
          <p className='text-sm text-gray-400'>No drivers registered yet</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {drivers.map((driver) => {
            const latest = latestScore(driver.id)
            const score  = latest?.overallScore ?? null
            return (
              <button
                key={driver.id}
                onClick={() => selectDriver(driver)}
                className='bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-blue-300 hover:shadow-sm transition'
              >
                <div className='flex items-center justify-between mb-4'>
                  <div>
                    <p className='text-sm font-semibold text-gray-800'>
                      {driver.name}
                    </p>
                    <p className='text-xs text-gray-400 mt-0.5'>
                      {driver.mobile}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${scoreBg(score)}`}>
                    <span className={`text-lg font-bold ${scoreColor(score)}`}>
                      {score ?? '--'}
                    </span>
                  </div>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  <ScorePill label='Braking'  value={latest?.brakingScore} />
                  <ScorePill label='Speed'    value={latest?.speedingScore} />
                  <ScorePill label='Cornering' value={latest?.corneringScore} />
                </div>
                {latest?.weekStart && (
                  <p className='text-xs text-gray-400 mt-3'>
                    Week of {new Date(latest.weekStart).toLocaleDateString('en-AU')}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {selected && (
        <div className='fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4'>
          <div className='bg-white rounded-xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto'>
            <div className='flex items-center justify-between mb-5'>
              <div>
                <h3 className='text-base font-semibold text-gray-800'>
                  {selected.name}
                </h3>
                <p className='text-xs text-gray-400 mt-0.5'>{selected.mobile}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className='text-gray-400 hover:text-gray-600 text-xl leading-none'
              >
                ×
              </button>
            </div>

            <h4 className='text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3'>
              Score History (last 12 weeks)
            </h4>

            {history.length === 0 ? (
              <p className='text-sm text-gray-400'>No score history yet</p>
            ) : (
              <div className='space-y-3'>
                {history.map((week, i) => (
                  <div
                    key={i}
                    className='flex items-center justify-between py-2 border-b border-gray-100'
                  >
                    <span className='text-sm text-gray-600'>
                      {new Date(week.weekStart).toLocaleDateString('en-AU', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                    <div className='flex items-center gap-4'>
                      <span className='text-xs text-gray-400'>
                        B: {week.brakingScore ?? '--'}
                      </span>
                      <span className='text-xs text-gray-400'>
                        S: {week.speedingScore ?? '--'}
                      </span>
                      <span className='text-xs text-gray-400'>
                        C: {week.corneringScore ?? '--'}
                      </span>
                      <span className={`text-sm font-bold ${scoreColor(week.overallScore)}`}>
                        {week.overallScore ?? '--'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setSelected(null)}
              className='w-full mt-5 h-9 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition'
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

function ScorePill({ label, value }) {
  return (
    <div className='bg-gray-50 rounded-lg px-2 py-1.5 text-center'>
      <p className='text-xs text-gray-400'>{label}</p>
      <p className='text-sm font-semibold text-gray-700'>{value ?? '--'}</p>
    </div>
  )
}