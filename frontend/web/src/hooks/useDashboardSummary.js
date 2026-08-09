import { useCallback, useEffect, useRef, useState } from 'react'
import api from '../lib/api'

const POLL_MS = 60_000

/**
 * Fetches GET /dashboard/summary and keeps it fresh with a low-frequency poll, paused while the
 * tab is hidden. The realtime pieces of the dashboard (live vehicle positions, the alert bell)
 * come from the socket instead — this poll only exists to refresh the aggregates a socket event
 * can't cheaply recompute (trend buckets, maintenance-due list, yesterday comparisons).
 */
export default function useDashboardSummary(days) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const daysRef = useRef(days)
  daysRef.current = days

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState(s => ({ ...s, loading: true, error: null }))
    try {
      const res = await api.get(`/dashboard/summary?days=${daysRef.current}`)
      setState({ data: res.data, loading: false, error: null })
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: err }))
    }
  }, [])

  useEffect(() => { load() }, [days, load])

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return
      load({ silent: true })
    }, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  return { ...state, refetch: () => load() }
}
