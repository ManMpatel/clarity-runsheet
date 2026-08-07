import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import api from './api'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
})

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
    const token = (await Notifications.getExpoPushTokenAsync({
      projectId: '4f46da0b-01ed-491e-9f9e-9faeadd451fc',
    })).data
    await api.put('/api/settings/push-token', { pushToken: token })
    console.log('[Push] Registered:', token)
    return token
  } catch (err) {
    console.error('[Push] Error:', err.message)
    return null
  }
}