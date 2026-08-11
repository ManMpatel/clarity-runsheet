// Mirrors google-verify.ts for Sign in with Apple, which App Store Guideline 4.8 requires
// alongside the existing Google Sign-In on iOS.
//
// Apple signs its identity tokens with rotating keys published as a JWKS at
// appleid.apple.com/auth/keys, so verification means fetching + caching that key set rather than
// holding a static secret. `jose`'s createRemoteJWKSet does the fetch, the cache, and the
// automatic re-fetch on an unknown `kid` — which is the part hand-rolled implementations get
// wrong and then break silently whenever Apple rotates.
import { createRemoteJWKSet, jwtVerify } from 'jose'

const APPLE_ISSUER = 'https://appleid.apple.com'
const APPLE_JWKS = createRemoteJWKSet(new URL(`${APPLE_ISSUER}/auth/keys`))

// The audience is the app's bundle identifier for a native iOS client (it's the Services ID only
// for web/Android flows, which this app doesn't use — iOS is the only platform showing the Apple
// button). Env-overridable so a rename doesn't need a code change.
const APPLE_AUDIENCE = process.env.APPLE_BUNDLE_ID || 'au.com.claritysoftware.fleet'

export interface AppleIdentity {
  /** Apple's `sub` — stable per (Apple account, app) forever. The real identity key. */
  appleId: string
  email: string | null
  emailVerified: boolean
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<AppleIdentity> {
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: APPLE_AUDIENCE,
  })

  if (!payload.sub) {
    throw new Error('Invalid Apple token — no sub in payload')
  }

  // `email` is absent on repeat sign-ins for some configurations, and `email_verified` arrives as
  // either a boolean or the string "true" depending on the flow — normalise both.
  const rawVerified = (payload as Record<string, unknown>).email_verified
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : null

  return {
    appleId: payload.sub,
    email,
    emailVerified: rawVerified === true || rawVerified === 'true',
  }
}
