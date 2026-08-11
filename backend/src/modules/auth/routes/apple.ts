// POST /api/v1/auth/apple/token — the Sign in with Apple counterpart to google.ts's
// mobileGoogleRouter. Required by App Store Guideline 4.8: an app offering a third-party social
// login (Google, here) must also offer an equivalent privacy-preserving option.
//
// There is no web/Passport half of this, unlike Google: the Apple button only renders on iOS
// (see frontend/mobile/src/screens/auth/LoginScreen.js), and the web dashboard keeps its existing
// Google redirect flow.
import express from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { users, companies } from '../../../db/schema'
import { asyncRoute } from '../../../middleware/response-envelope'
import { issueAccessToken, issueRefreshToken, setRefreshCookie } from '../services/tokens'
import { verifyAppleIdentityToken } from '../services/apple-verify'
import { slugify } from '../passport'

export const mobileAppleRouter = express.Router()

mobileAppleRouter.post('/token', asyncRoute(async (req, res) => {
  // `fullName` is sent by the client ONLY on the very first authorisation — Apple never returns
  // it again for the same (account, app) pair, so if it isn't captured now it's gone for good.
  // The client reads it off the credential and forwards it; see authStore.appleLogin.
  const { identityToken, fullName } = req.body
  if (!identityToken) return res.fail(null, 'identityToken required')

  let identity
  try {
    identity = await verifyAppleIdentityToken(identityToken)
  } catch (err: any) {
    return res.fail(null, 'Invalid Apple token', 401)
  }

  // Match on appleId FIRST. The email is not a stable key for these accounts: users can sign in
  // with a Private Relay alias and can revoke forwarding later, and Apple explicitly documents
  // `sub` as the identifier to key on. Email is only a fallback so that someone who signed up
  // with email/password and later taps "Sign in with Apple" lands on their existing account
  // instead of silently getting a second one.
  let [user] = await db.select().from(users).where(eq(users.appleId, identity.appleId)).limit(1)

  if (!user && identity.email) {
    ;[user] = await db.select().from(users).where(eq(users.email, identity.email)).limit(1)
    if (user) {
      await db.update(users).set({ appleId: identity.appleId, updatedAt: new Date() }).where(eq(users.id, user.id))
    }
  }

  if (!user) {
    if (!identity.email) {
      // Only reachable if Apple withholds the email on a first-ever sign-in, which shouldn't
      // happen — but creating an account with no contact address at all would be worse.
      return res.fail(null, 'Apple did not provide an email address for this account')
    }

    const displayName = [fullName?.givenName, fullName?.familyName].filter(Boolean).join(' ').trim()
      || identity.email.split('@')[0]

    const slug = slugify(displayName)
    const [existingCompany] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
    const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

    const [company] = await db.insert(companies).values({
      name: displayName,
      slug: finalSlug,
      subscriptionTier: 'locked',
    }).returning()

    ;[user] = await db.insert(users).values({
      companyId: company.id,
      name: displayName,
      email: identity.email,
      appleId: identity.appleId,
      role: 'companyAdmin',
      subscriptionTier: 'locked',
      // Apple has already verified the address (or issued a relay it controls), so there's no
      // second verification email to send — same reasoning as the Google path.
      emailVerified: true,
    }).returning()
  }

  const [company] = user.companyId
    ? await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1)
    : []

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

export default mobileAppleRouter
