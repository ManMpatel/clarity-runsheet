// Web Google OAuth strategy config — moved from api/routes/auth-google.js:9-14. Kept as Passport's
// redirect flow per Phase 4 spec (web only; mobile uses the token-verify endpoint in routes/google.ts
// instead, since it doesn't do browser redirects).
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { eq } from 'drizzle-orm'
import { db } from '../../db/client'
import { companies, users } from '../../db/schema'

passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    callbackURL: process.env.GOOGLE_CALLBACK_URL!,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = profile.emails![0].value.toLowerCase()
      const name = profile.displayName

      let [user] = await db.select().from(users).where(eq(users.email, email)).limit(1)

      if (!user) {
        const slug = slugify(name)
        const [existingCompany] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
        const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

        const [company] = await db.insert(companies).values({
          name,
          slug: finalSlug,
          subscriptionTier: 'locked',
        }).returning()

        ;[user] = await db.insert(users).values({
          companyId: company.id,
          name,
          email,
          googleId: profile.id,
          role: 'companyAdmin',
          subscriptionTier: 'locked',
          emailVerified: true, // Google already verified the email
        }).returning()
      }

      return done(null, user)
    } catch (err) {
      return done(err as Error, undefined)
    }
  }
))

export function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default passport
