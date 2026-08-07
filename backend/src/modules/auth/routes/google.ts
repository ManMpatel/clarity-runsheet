// Two separate code paths, per Phase 4 spec — the flow is fundamentally different per client:
//   - web: Passport redirect flow, mounted OUTSIDE /api/v1 (it's a browser redirect, not
//     something mobile calls). Router exported as `webGoogleRouter`, mounted at /auth/google.
//   - mobile: POST /api/v1/auth/google/token, verifies a client-obtained Google ID token via
//     google-auth-library (google-verify.ts) instead of Passport. Router exported as
//     `mobileGoogleRouter`, mounted under /api/v1/auth/google.
import express from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { users, companies } from '../../../db/schema'
import { asyncRoute } from '../../../middleware/response-envelope'
import { issueAccessToken, issueRefreshToken, setRefreshCookie } from '../services/tokens'
import { verifyGoogleIdToken } from '../services/google-verify'
import { slugify } from '../passport'
import passport from '../passport'

export const webGoogleRouter = express.Router()

webGoogleRouter.get('/', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}))

webGoogleRouter.get('/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google' }),
  asyncRoute(async (req, res) => {
    const user = req.user as typeof users.$inferSelect
    const [company] = user.companyId ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1) : []

    const accessToken = issueAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
      subscriptionTier: user.subscriptionTier || 'entry',
      accountType: company?.accountType || 'contractor',
    })
    const refreshToken = await issueRefreshToken(user.id)
    setRefreshCookie(res, refreshToken)

    const onboarding = company?.onboardingComplete ? 'true' : 'false'
    const webUrl = process.env.WEB_URL || process.env.DASHBOARD_URL || 'http://localhost:5173'

    // No redirect responses anywhere under /api/v1/* — but this route is deliberately OUTSIDE
    // /api/v1 precisely because a browser OAuth callback has to redirect. The refresh token
    // already landed in the httpOnly cookie above; only the short-lived access token travels in
    // the URL (matches the existing GoogleAuthSuccess.jsx page's expectations).
    res.redirect(`${webUrl}/auth/google/success?token=${accessToken}&onboarding=${onboarding}`)
  })
)

export const mobileGoogleRouter = express.Router()

mobileGoogleRouter.post('/token', asyncRoute(async (req, res) => {
  const { idToken } = req.body
  if (!idToken) return res.fail(null, 'idToken required')

  const identity = await verifyGoogleIdToken(idToken)

  let [user] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1)

  if (!user) {
    const slug = slugify(identity.name)
    const [existingCompany] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
    const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

    const [company] = await db.insert(companies).values({
      name: identity.name,
      slug: finalSlug,
      subscriptionTier: 'locked',
    }).returning()

    ;[user] = await db.insert(users).values({
      companyId: company.id,
      name: identity.name,
      email: identity.email,
      googleId: identity.googleId,
      role: 'companyAdmin',
      subscriptionTier: 'locked',
      emailVerified: true,
    }).returning()
  } else if (!user.googleId) {
    await db.update(users).set({ googleId: identity.googleId }).where(eq(users.id, user.id))
  }

  const [company] = user.companyId ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1) : []

  const accessToken = issueAccessToken({
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    subscriptionTier: user.subscriptionTier || company?.subscriptionTier || 'locked',
    accountType: company?.accountType || 'contractor',
  })
  const refreshToken = await issueRefreshToken(user.id)
  setRefreshCookie(res, refreshToken) // harmless no-op for a native client with no cookie jar

  return res.success({
    accessToken,
    refreshToken,
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role,
      subscriptionTier: user.subscriptionTier || 'locked', companyId: user.companyId,
    },
  })
}))
