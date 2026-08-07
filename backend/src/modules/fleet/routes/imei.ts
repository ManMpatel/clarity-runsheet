// Ported from api/routes/imei.js. Mongo native driver -> Drizzle/Postgres. The `devices.imei`
// column now has a REAL unique constraint (see db/schema/misc.ts note — the old code claimed one
// existed via a Mongo error-code-11000 check, but api/db/setup.js never actually created it).
import express from 'express'
import { desc, eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { devices } from '../../../db/schema'
import { requireAuth } from '../../../middleware/auth-guard'
import { asyncRoute } from '../../../middleware/response-envelope'

const router = express.Router()

// GET /api/v1/imei/check?imei=123456789012345
router.get('/check', requireAuth, asyncRoute(async (req, res) => {
  const { imei } = req.query as Record<string, string>

  if (!imei) {
    return res.fail(null, 'IMEI required')
  }

  if (!/^\d{15}$/.test(imei)) {
    return res.fail(null, 'IMEI must be exactly 15 digits')
  }

  const [device] = await db.select().from(devices).where(eq(devices.imei, imei)).limit(1)

  if (!device) {
    return res.success({ status: 'unregistered', message: 'Device is available to register' })
  }

  if (device.registeredByCompanyId === req.companyId) {
    return res.success({
      status: 'registered_to_you',
      message: 'Already registered to your account',
      imei: device.imei,
      registeredAt: device.registeredAt,
    })
  }

  return res.success({
    status: 'registered_to_other',
    message: 'This IMEI is already registered to another account',
  })
}))

// POST /api/v1/imei/register
// Garage registers IMEI before installation — locks commission to their companyId
router.post('/register', requireAuth, asyncRoute(async (req, res) => {
  const { imei, deviceType, notes } = req.body

  if (!imei) {
    return res.fail(null, 'IMEI required')
  }

  if (!/^\d{15}$/.test(imei)) {
    return res.fail(null, 'IMEI must be exactly 15 digits')
  }

  try {
    const [device] = await db.insert(devices).values({
      imei,
      deviceType: deviceType || 'FMC920',
      registeredByCompanyId: req.companyId!,
      customerId: null,
      subscriptionStatus: 'pending',
      notes: notes || '',
    }).returning()

    return res.success({
      imei,
      registeredAt: device.registeredAt,
    }, 'Device registered successfully')
  } catch (err: any) {
    // Postgres unique-violation on devices.imei
    if (err.code === '23505') {
      return res.fail(null, 'IMEI already registered', 409)
    }
    throw err
  }
}))

// GET /api/v1/imei/my-devices
// Garage owner sees all devices they have registered
router.get('/my-devices', requireAuth, asyncRoute(async (req, res) => {
  const list = await db.select().from(devices)
    .where(eq(devices.registeredByCompanyId, req.companyId!))
    .orderBy(desc(devices.registeredAt))

  return res.success(list)
}))

export default router
