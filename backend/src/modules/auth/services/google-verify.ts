// Replaces the old mobile Google auth flow's raw `fetch('https://oauth2.googleapis.com/tokeninfo
// ?id_token=...')` call with proper server-side verification via google-auth-library. The
// tokeninfo endpoint is not intended for production token verification (undocumented rate limits,
// no audience-binding guarantee) — this is a deliberate security upgrade, called for explicitly
// in the Phase 4 spec, not scope creep.
import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export interface GoogleIdentity {
  email: string
  name: string
  googleId: string
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  })

  const payload = ticket.getPayload()
  if (!payload?.email) {
    throw new Error('Invalid Google token — no email in payload')
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email.split('@')[0],
    googleId: payload.sub,
  }
}
