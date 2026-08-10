import { useEffect, useState } from 'react'
import api from '../lib/api'
import { useFleetSocket } from './useSocket'

// Backs the tab-bar Alerts badge. Fetches the starting count once (the /alerts list endpoint
// already returns `unread` alongside the page, see backend fleet/routes/alerts.ts), then
// increments live off the same `alert:new` socket event the Alerts screen itself listens to,
// rather than re-polling — this is a persistent badge, not a screen, so it shouldn't open its own
// second subscription.
export function useUnreadAlertCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    api.get('/alerts?limit=1').then((res) => setCount(res.data?.unread || 0)).catch(() => {})
  }, [])

  useFleetSocket({ onAlert: () => setCount((c) => c + 1) })

  return count
}
