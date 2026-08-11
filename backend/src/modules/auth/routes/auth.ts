// Ported from api/routes/auth.js. Every handler now: queries Postgres via Drizzle instead of
// the Mongo native driver, returns the {success,message,data,errors} envelope instead of raw
// JSON/{error}, and /login + /refresh issue the new access+refresh token PAIR (dual cookie+body
// delivery) instead of a single 7d JWT. Also fixes bug #5 found during discovery: the old
// /refresh referenced an undefined `company` variable (ReferenceError on every call) — moot now
// since /refresh is rebuilt from scratch around the refresh-token table instead of re-signing
// from the access token's own claims.
import express from 'express'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { users, companies } from '../../../db/schema'
import { requireAuth } from '../../../middleware/auth-guard'
import { asyncRoute, ApiError } from '../../../middleware/response-envelope'
import { authRateLimit } from '../../../middleware/rate-limit'
import { hashPassword, verifyPassword } from '../services/passwords'
import { issueAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken, setRefreshCookie, clearRefreshCookie, readRefreshToken, type TokenPayload } from '../services/tokens'
import { sendEmailVerification, sendPasswordReset } from '../../notifications/email'
import { slugify } from '../passport'

const router = express.Router()

async function issueTokenPair(res: import('express').Response, user: typeof users.$inferSelect, company?: typeof companies.$inferSelect | null) {
  const payload: TokenPayload = {
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    subscriptionTier: user.subscriptionTier || 'entry',
    accountType: company?.accountType || 'contractor',
  }
  const accessToken = issueAccessToken(payload)
  const refreshToken = await issueRefreshToken(user.id)
  setRefreshCookie(res, refreshToken)
  return { accessToken, refreshToken }
}

router.post('/login', authRateLimit, asyncRoute(async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.fail(null, 'Email and password required')

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  if (!user || !user.passwordHash) return res.fail(null, 'Invalid credentials', 401)

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return res.fail(null, 'Invalid credentials', 401)

  if (!user.emailVerified) {
    return res.fail(null, 'Please verify your email before logging in. Check your inbox.', 403)
  }

  const [company] = user.companyId ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1) : []
  const { accessToken, refreshToken } = await issueTokenPair(res, user, company)

  return res.success({
    accessToken,
    refreshToken, // also in the body — mobile has no cookie jar, stores this in SecureStore
    onboardingComplete: company?.onboardingComplete || false,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}))

router.post('/signup', authRateLimit, asyncRoute(async (req, res) => {
  const { companyName, name, email, password, driverConsent } = req.body
  if (!companyName || !name || !email || !password) return res.fail(null, 'All fields required')
  if (!driverConsent) return res.fail(null, 'Driver consent is required')
  if (password.length < 8) return res.fail(null, 'Password too short')

  const [existing] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)
  if (existing) return res.fail(null, 'Email already registered', 409)

  const slug = slugify(companyName)
  const [existingCompany] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
  const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

  const [company] = await db.insert(companies).values({
    name: companyName,
    slug: finalSlug,
    subscriptionTier: 'locked',
  }).returning()

  const passwordHash = await hashPassword(password)
  const verifyToken = crypto.randomBytes(32).toString('hex')
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip

  await db.insert(users).values({
    companyId: company.id,
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'companyAdmin',
    subscriptionTier: 'locked',
    emailVerified: false,
    emailVerifyToken: verifyToken,
    emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    driverConsentGiven: true,
    driverConsentGivenAt: new Date(),
    driverConsentIp: clientIp,
  })

  sendEmailVerification(email.toLowerCase(), name, verifyToken)

  return res.success(null, 'Account created. Please check your email to verify your account.')
}))

router.post('/refresh', asyncRoute(async (req, res) => {
  const raw = readRefreshToken(req)
  if (!raw) return res.fail(null, 'No refresh token provided', 401)

  const rotated = await rotateRefreshToken(raw)
  if (!rotated) {
    clearRefreshCookie(res)
    return res.fail(null, 'Refresh token invalid or expired', 401)
  }

  const [user] = await db.select().from(users).where(eq(users.id, rotated.userId)).limit(1)
  if (!user) return res.fail(null, 'User not found', 401)

  const [company] = user.companyId ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1) : []

  const accessToken = issueAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    subscriptionTier: user.subscriptionTier || 'entry',
    accountType: company?.accountType || 'contractor',
  })

  setRefreshCookie(res, rotated.token)
  return res.success({ accessToken, refreshToken: rotated.token })
}))

router.post('/logout', asyncRoute(async (req, res) => {
  const raw = readRefreshToken(req)
  if (raw) await revokeRefreshToken(raw)
  clearRefreshCookie(res)
  return res.success(null, 'Logged out')
}))

router.get('/me', requireAuth, asyncRoute(async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, (req.user!.userId as string))).limit(1)
  if (!user) return res.fail(null, 'User not found', 404)
  const { passwordHash, ...safe } = user
  // The hash itself never leaves the server, but clients need to know whether one EXISTS: an
  // SSO-only account (Google/Apple) has nothing to type into a "confirm your password" prompt,
  // and both the change-password and delete-account flows branch on that.
  return res.success({ ...safe, hasPassword: !!passwordHash })
}))

// App Store Guideline 5.1.1(v): an app that lets users create an account in-app must let them
// initiate deletion of it in-app too. There was no such path anywhere — this is the endpoint
// behind ProfileScreen's "Delete account" row (frontend/mobile).
//
// Two shapes, because this is multi-tenant B2B and "delete my account" means different things
// depending on who's asking:
//   - Sole user of the company -> the whole tenant goes. Deleting the `companies` row cascades to
//     vehicles, trips, telemetry, alerts, geofences, maintenance, drivers, safety scores and
//     everything else (every company-scoped table declares onDelete:'cascade'), which is the
//     honest reading of "delete my account and my data".
//   - Other users remain -> only this user goes. If they were the last companyAdmin, the
//     longest-standing remaining user is promoted so the company isn't left with no admin and no
//     way to get one. Deliberately always succeeds rather than refusing with "transfer ownership
//     first" — a deletion path that can dead-end is exactly what Apple rejects for.
//
// Password re-entry is required for accounts that have one. This destroys a whole company's data
// and a stolen 15-minute access token shouldn't be enough to do it. SSO-only accounts (Google/
// Apple) have no passwordHash and rely on the client's two-step confirmation instead.
router.delete('/me', requireAuth, asyncRoute(async (req, res) => {
  const { password } = req.body || {}
  const userId = req.user!.userId as string

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return res.fail(null, 'User not found', 404)

  if (user.role === 'superAdmin') {
    return res.fail(null, 'Super admin accounts cannot be deleted from the app', 403)
  }

  if (user.passwordHash) {
    if (!password) return res.fail(null, 'Enter your password to confirm deletion')
    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) return res.fail(null, 'Password incorrect', 401)
  }

  if (user.companyId) {
    const companyUsers = await db.select({ id: users.id, role: users.role, createdAt: users.createdAt })
      .from(users).where(eq(users.companyId, user.companyId))

    const others = companyUsers.filter((u) => u.id !== user.id)

    if (others.length === 0) {
      // Sole user — drop the tenant. The users row goes with it via ON DELETE SET NULL on
      // users.company_id, so delete the user explicitly afterwards.
      await db.delete(companies).where(eq(companies.id, user.companyId))
      await db.delete(users).where(eq(users.id, user.id))
      clearRefreshCookie(res)
      return res.success(null, 'Account and company data deleted')
    }

    const adminsLeft = others.filter((u) => u.role === 'companyAdmin')
    if (user.role === 'companyAdmin' && adminsLeft.length === 0) {
      const successor = [...others].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0]
      await db.update(users).set({ role: 'companyAdmin', updatedAt: new Date() }).where(eq(users.id, successor.id))
    }
  }

  // refresh_tokens and device_tokens both cascade on user_id, so sessions are revoked and push
  // stops going to this user's devices as a side effect of the delete.
  await db.delete(users).where(eq(users.id, user.id))
  clearRefreshCookie(res)
  return res.success(null, 'Account deleted')
}))

router.post('/resend-verification', requireAuth, asyncRoute(async (req, res) => {
  const [user] = await db.select().from(users).where(eq(users.id, (req.user!.userId as string))).limit(1)
  if (!user) return res.fail(null, 'User not found', 404)
  if (user.emailVerified) return res.fail(null, 'Email already verified')

  const token = crypto.randomBytes(32).toString('hex')
  await db.update(users).set({
    emailVerifyToken: token,
    emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).where(eq(users.id, user.id))

  sendEmailVerification(user.email, user.name, token)
  return res.success(null, 'Verification email sent')
}))

router.put('/profile', requireAuth, asyncRoute(async (req, res) => {
  const { name } = req.body
  if (!name) return res.fail(null, 'Name required')

  const [updated] = await db.update(users).set({ name, updatedAt: new Date() })
    .where(eq(users.id, (req.user!.userId as string))).returning()
  const { passwordHash, ...safe } = updated
  return res.success(safe)
}))

router.put('/password', requireAuth, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.fail(null, 'Both passwords required')
  if (newPassword.length < 8) return res.fail(null, 'Password must be at least 8 characters')

  const [user] = await db.select().from(users).where(eq(users.id, (req.user!.userId as string))).limit(1)
  const valid = await verifyPassword(currentPassword, user.passwordHash!)
  if (!valid) return res.fail(null, 'Current password incorrect', 401)

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id))
  return res.success(null, 'Password updated')
}))

router.post('/forgot-password', authRateLimit, asyncRoute(async (req, res) => {
  const { email } = req.body
  if (!email) return res.fail(null, 'Email required')

  const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1)

  if (user) {
    const token = crypto.randomBytes(32).toString('hex')
    await db.update(users).set({
      resetToken: token,
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    }).where(eq(users.id, user.id))
    sendPasswordReset(user.email, user.name, token)
  }

  // Same response whether or not the email exists — don't leak account existence.
  return res.success(null, 'If that email exists, a reset link has been sent.')
}))

router.post('/reset-password', asyncRoute(async (req, res) => {
  const { token, newPassword } = req.body
  if (!token || !newPassword) return res.fail(null, 'Token and new password required')
  if (newPassword.length < 8) return res.fail(null, 'Password must be at least 8 characters')

  const [user] = await db.select().from(users).where(eq(users.resetToken, token)).limit(1)
  if (!user) return res.fail(null, 'Invalid or expired link')
  if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
    return res.fail(null, "Link expired — request a new one")
  }

  const passwordHash = await hashPassword(newPassword)
  await db.update(users).set({
    passwordHash, updatedAt: new Date(), resetToken: null, resetTokenExpiry: null,
  }).where(eq(users.id, user.id))

  return res.success(null, 'Password reset')
}))

router.get('/verify-email', asyncRoute(async (req, res) => {
  const { token } = req.query
  if (!token) return res.fail(null, 'Token required')

  const [user] = await db.select().from(users).where(eq(users.emailVerifyToken, token as string)).limit(1)
  if (!user) return res.fail(null, 'Invalid or expired link')
  if (!user.emailVerifyExpiry || new Date() > new Date(user.emailVerifyExpiry)) {
    return res.fail(null, "Link expired — request a new one")
  }

  await db.update(users).set({
    emailVerified: true, updatedAt: new Date(), emailVerifyToken: null, emailVerifyExpiry: null,
  }).where(eq(users.id, user.id))

  const [company] = user.companyId ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1) : []
  const { accessToken, refreshToken } = await issueTokenPair(res, user, company)

  return res.success({
    accessToken,
    refreshToken,
    onboardingComplete: company?.onboardingComplete || false,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
}))

export default router
