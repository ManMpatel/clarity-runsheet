// NEW dispatch module, replacing worker/services/push.js's inline fetch-to-Expo call. Driven by
// the new `device_tokens` table (populated via POST /api/v1/notifications/register-device)
// instead of the old `users.pushToken` single-token field.
//
// DECISION: kept Expo's push service (expo-server-sdk) server-side rather than switching to raw
// `firebase-admin`/FCM. Expo's push service already proxies to FCM (Android) and APNs (iOS)
// under the hood, which satisfies "one integration covers both platforms" from the spec without
// forcing a mobile-side SDK swap (frontend/mobile already uses `expo-notifications`, which issues
// Expo push tokens, not raw FCM tokens — switching would mean adding
// `@react-native-firebase/messaging` and reworking the mobile permission/token flow). Flagged for
// reconsideration if there's a concrete reason to want raw FCM (e.g. a future non-Expo mobile
// build).
import { Expo } from 'expo-server-sdk'
import { inArray } from 'drizzle-orm'
import { db } from '../../db/client'
import { deviceTokens } from '../../db/schema'

const expo = new Expo(process.env.EXPO_ACCESS_TOKEN ? { accessToken: process.env.EXPO_ACCESS_TOKEN } : undefined)

export async function registerDeviceToken(userId: string, platform: string, token: string) {
  await db.insert(deviceTokens).values({ userId, platform, token, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [deviceTokens.userId, deviceTokens.platform, deviceTokens.token],
      set: { updatedAt: new Date() },
    })
}

export async function sendPushToUsers(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  if (userIds.length === 0) return

  const tokenRows = await db.select().from(deviceTokens).where(inArray(deviceTokens.userId, userIds))

  const messages = tokenRows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({ to: r.token, title, body, data, sound: 'default' as const }))

  if (messages.length === 0) return

  const chunks = expo.chunkPushNotifications(messages)
  for (const chunk of chunks) {
    try {
      await expo.sendPushNotificationsAsync(chunk)
    } catch (err: any) {
      console.error('[Push] Send error:', err.message)
    }
  }
}
