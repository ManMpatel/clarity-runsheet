// Sweeps Expo push delivery receipts and prunes dead device_tokens — see the header comment on
// checkPushReceipts() in modules/notifications/push.ts for why this exists and why it's a cron
// rather than something run inline at send time. Every 15 minutes, matching Expo's own guidance
// on how long a receipt typically takes to become available after a send.
import cron from 'node-cron'
import { checkPushReceipts } from '../../notifications/push'

export function startPushReceiptCron() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await checkPushReceipts()
    } catch (err: any) {
      console.error('[Cron] Push receipt check error:', err.message)
    }
  })
  console.log('[Cron] Push receipt check scheduled — runs every 15 minutes')
}
