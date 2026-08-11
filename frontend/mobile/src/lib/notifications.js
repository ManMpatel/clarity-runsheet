import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import api from './api'

// `shouldShowAlert` is deprecated in SDK 54 and replaced by the explicit banner/list pair
// (see node_modules/expo-notifications/build/Notifications.types.d.ts). Because this is JS rather
// than TS the old key produced no error — it just silently stopped presenting foreground banners
// on iOS, which reads as "push is broken" to anyone testing with the app open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true, // heads-up banner while the app is foregrounded
    shouldShowList:   true, // and a row in Notification Centre / the shade
    shouldPlaySound:  true,
    shouldSetBadge:   true,
  }),
})

// Read from the resolved app config rather than hardcoded, so this can't drift from
// app.config.js's `extra.eas.projectId` (it previously duplicated the UUID inline).
const PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ||
  Constants.easConfig?.projectId

export async function registerForPushNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name:             'default',
      importance:       Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    })
  }

  const { status: existing } = await Notifications.getPermissionsAsync()
  let finalStatus = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('[Push] Permission denied')
    return null
  }

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data
    await api.post('/notifications/register-device', { platform: Platform.OS, token })
    return token
  } catch (err) {
    console.error('[Push] Error:', err.message)
    return null
  }
}

// Called on logout. Without this the device_tokens row outlives the session and the next person
// to sign in on the same phone keeps receiving the previous user's company alerts — a real
// cross-tenant leak on any shared or handed-down device.
export async function unregisterPushToken() {
  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID })).data
    await api.delete('/notifications/register-device', { data: { token } })
  } catch {
    // Permission revoked, offline, or no token was ever issued — nothing to clean up client-side.
    // The server also prunes tokens Expo reports as DeviceNotRegistered (notifications/push.ts).
  }
}
