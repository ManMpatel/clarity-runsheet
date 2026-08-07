// Ported from api/routes/admin-auth.js. Logic preserved as-is (two-stage: password -> 5min
// tempToken -> TOTP -> 8h admin token) — only the target table changed, from a separate
// `super_admins` Mongo collection to `users` with role='superAdmin' (see Phase 3 schema note on
// why super_admins was merged rather than kept separate).
import express from 'express'
import jwt from 'jsonwebtoken'
import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { eq, and } from 'drizzle-orm'
import { db } from '../../../db/client'
import { users } from '../../../db/schema'
import { asyncRoute } from '../../../middleware/response-envelope'
import { authRateLimit } from '../../../middleware/rate-limit'
import { hashPassword, verifyPassword } from '../services/passwords'

const router = express.Router()

router.post('/login', authRateLimit, asyncRoute(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.fail(null, 'Email and password required')

  const [admin] = await db.select().from(users)
    .where(and(eq(users.email, email.toLowerCase()), eq(users.role, 'superAdmin'))).limit(1)
  if (!admin || !admin.passwordHash) return res.fail(null, 'Invalid credentials', 401)

  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) return res.fail(null, 'Invalid credentials', 401)

  if (!admin.totpSecret) return res.fail(null, 'TOTP not configured for this account', 403)

  const tempToken = jwt.sign(
    { adminId: admin.id, stage: 'password_ok' },
    process.env.JWT_SECRET!,
    { expiresIn: '5m' }
  )

  return res.success({ tempToken })
}))

router.post('/verify-totp', asyncRoute(async (req, res) => {
  const { tempToken, code } = req.body
  if (!tempToken || !code) return res.fail(null, 'Token and code required')

  let decoded: any
  try {
    decoded = jwt.verify(tempToken, process.env.JWT_SECRET!)
  } catch {
    return res.fail(null, 'Temp token invalid or expired', 401)
  }
  if (decoded.stage !== 'password_ok') return res.fail(null, 'Invalid token stage', 401)

  const [admin] = await db.select().from(users).where(eq(users.id, decoded.adminId)).limit(1)
  if (!admin) return res.fail(null, 'Admin not found', 401)

  const valid = speakeasy.totp.verify({ secret: admin.totpSecret!, encoding: 'base32', token: code })
  if (!valid) return res.fail(null, 'Invalid authenticator code', 401)

  const adminToken = jwt.sign(
    { userId: admin.id, adminId: admin.id, role: 'superAdmin', totp_verified: true },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' }
  )

  return res.success({ token: adminToken, admin: { email: admin.email } })
}))

router.post('/setup-totp', authRateLimit, asyncRoute(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.fail(null, 'Email and password required')

  const [admin] = await db.select().from(users)
    .where(and(eq(users.email, email.toLowerCase()), eq(users.role, 'superAdmin'))).limit(1)
  if (!admin || !admin.passwordHash) return res.fail(null, 'Invalid credentials', 401)

  const valid = await verifyPassword(password, admin.passwordHash)
  if (!valid) return res.fail(null, 'Invalid credentials', 401)
  if (admin.totpSecret) return res.fail(null, 'TOTP already configured', 409)

  const secret = speakeasy.generateSecret({ name: 'Clarity Fleet Admin' })
  const otpAuthUrl = speakeasy.otpauthURL({
    secret: secret.base32, label: admin.email, issuer: 'Clarity Fleet Admin', encoding: 'base32',
  })
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl)

  await db.update(users).set({
    totpSecret: secret.base32, totpConfiguredAt: new Date(),
  }).where(eq(users.id, admin.id))

  return res.success({ qrDataUrl, secret: secret.base32 })
}))

export default router
