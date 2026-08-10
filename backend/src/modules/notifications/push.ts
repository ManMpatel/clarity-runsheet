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
import { eq, inArray } from 'drizzle-orm'
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

// Expo's send call only confirms Expo *accepted* the message — it returns a receipt ID per
// message, and the actual FCM/APNs delivery result isn't known until that receipt is fetched
// separately, usually 15+ minutes later (Expo's own guidance). Previously nothing fetched
// receipts at all, so a token that had gone stale (app uninstalled, device deregistered — Expo
// reports this as `DeviceNotRegistered`) stayed in `device_tokens` forever: every future alert
// paid the cost of a push send to a token that could never succeed. Pending receipts are tracked
// in memory (not the DB — this is a short-lived, best-effort cleanup job, not durable state) and
// swept by checkPushReceipts(), wired to a cron in entrypoints/ingestion.ts alongside the
// existing maintenance/licence-expiry crons.
const pendingReceipts: Array<{ receiptId: string; token: string }> = []

export async function sendPushToUsers(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  if (userIds.length === 0) return

  const tokenRows = await db.select().from(deviceTokens).where(inArray(deviceTokens.userId, userIds))

  const targets = tokenRows.filter((r) => Expo.isExpoPushToken(r.token))
  const messages = targets.map((r) => ({ to: r.token, title, body, data, sound: 'default' as const }))

  if (messages.length === 0) return

  const chunks = expo.chunkPushNotifications(messages)
  let cursor = 0
  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk)
      tickets.forEach((ticket, i) => {
        const token = targets[cursor + i]?.token
        if (ticket.status === 'ok' && token) {
          pendingReceipts.push({ receiptId: ticket.id, token })
        } else if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' && token) {
          // Expo can tell us this synchronously, at send time, for some failures — no need to
          // wait for the async receipt in that case.
          pruneToken(token).catch(() => {})
        }
      })
      cursor += chunk.length
    } catch (err: any) {
      console.error('[Push] Send error:', err.message)
      cursor += chunk.length
    }
  }
}

async function pruneToken(token: string) {
  await db.delete(deviceTokens).where(eq(deviceTokens.token, token))
  console.log(`[Push] Pruned dead token: ${token.slice(0, 24)}…`)
}

// Fetches delivery receipts for everything sent since the last sweep and prunes any token Expo
// reports as permanently undeliverable. Safe to call even if a receipt isn't ready yet — Expo
// just omits it from the response and it's left in `pendingReceipts` for the next sweep.
export async function checkPushReceipts() {
  if (pendingReceipts.length === 0) return

  const batch = pendingReceipts.splice(0, pendingReceipts.length)
  const chunks = expo.chunkPushNotificationReceiptIds(batch.map((b) => b.receiptId))

  for (const chunk of chunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk)
      for (const [receiptId, receipt] of Object.entries(receipts)) {
        if (receipt.status === 'error' && (receipt as any).details?.error === 'DeviceNotRegistered') {
          const match = batch.find((b) => b.receiptId === receiptId)
          if (match) await pruneToken(match.token)
        }
        // Any receipt not yet resolved by Expo (still pending) simply isn't in `receipts` — drop
        // it rather than re-queueing, since Expo only retains receipts for a limited window and
        // an alert-heavy fleet would otherwise grow this list unbounded.
      }
    } catch (err: any) {
      console.error('[Push] Receipt check error:', err.message)
    }
  }
}
