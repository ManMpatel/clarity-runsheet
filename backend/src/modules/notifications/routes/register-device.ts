// New — POST /api/v1/notifications/register-device, called by both frontend apps after
// requesting notification permission. Backs the device_tokens table (Phase 3 schema) that
// notifications/push.ts dispatches against.
import express from 'express'
import { requireAuth } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'
import { registerDeviceToken } from '../push'

const router = express.Router()

router.post('/register-device', requireAuth, asyncRoute(async (req, res) => {
  const { platform, token } = req.body
  if (!platform || !token) return res.fail(null, 'platform and token required')

  await registerDeviceToken(req.user!.userId, platform, token)
  return res.success(null, 'Device registered')
}))

export default router
