import { useEffect } from 'react'
import * as Notifications from 'expo-notifications'
import { navigate } from '../navigation/navigationRef'

// Tapping a push notification (foreground, background, or cold-start — Expo queues the response
// that launched the app and delivers it once a listener is attached) lands on the Alerts tab.
// The backend sends every alert push with `data: {type, vehicleId}` (see
// backend/src/modules/ingestion/processors/alerts.ts's fireAlert) — not routed to a per-alert
// detail screen since Alerts already shows the full message inline; this just gets the user to
// the right tab instead of wherever they happened to be.
export function useNotificationDeepLink() {
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      navigate('Tabs', { screen: 'Alerts' })
    })
    return () => sub.remove()
  }, [])
}
