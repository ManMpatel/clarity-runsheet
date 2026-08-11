// New — POST /api/v1/notifications/register-device, called by both frontend apps after
// requesting notification permission. Backs the device_tokens table (Phase 3 schema) that
// notifications/push.ts dispatches against.
import express from 'express'
import { requireAuth } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { registerDeviceToken, unregisterDeviceToken } from '../push'

const router = express.Router()

router.post('/register-device', requireAuth, asyncRoute(async (req, res) => {
  const { platform, token } = req.body
  if (!platform || !token) return res.fail(null, 'platform and token required')

  await registerDeviceToken(req.user!.userId as string, platform, token)
  return res.success(null, 'Device registered')
}))

// Called by the mobile app on logout. Scoped to the calling user so one account can't deregister
// another's device: on a shared phone the row would otherwise outlive the session and the next
// person signing in would keep receiving the previous user's company alerts.
router.delete('/register-device', requireAuth, asyncRoute(async (req, res) => {
  const { token } = req.body || {}
  if (!token) return res.fail(null, 'token required')

  await unregisterDeviceToken(req.user!.userId as string, token)
  return res.success(null, 'Device unregistered')
}))

export default router
