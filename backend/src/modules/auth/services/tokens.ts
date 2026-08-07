// New infrastructure — the old codebase had no refresh-token concept at all, just a single 7d
// (or 90d for Google mobile) access token with no revocation path. Per Phase 4 spec: access
// tokens are short-lived (~15min), refresh tokens are long-lived (~30d) and stored HASHED so a
// leaked DB read alone can't be replayed as a live session.
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { eq } from 'drizzle-orm'
import { db } from '../../../db/client'
import { refreshTokens } from '../../../db/schema'

const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m'
const REFRESH_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_EXPIRY_DAYS || 30)

export interface TokenPayload {
  userId: string
  companyId: string | null
  role: string
  subscriptionTier: string | null
  accountType: string | null
}

export function issueAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions)
}

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const raw = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await db.insert(refreshTokens).values({
    userId,
    tokenHash: hashToken(raw),
    expiresAt,
  })

  return raw
}

// Verifies a raw refresh token against the stored hash, then ROTATES it: the old row is revoked
// and a new one issued. Returns the new raw token + the userId it belongs to, or null if invalid/
// expired/revoked.
export async function rotateRefreshToken(raw: string): Promise<{ userId: string; token: string } | null> {
  const hash = hashToken(raw)
  const [row] = await db.select().from(refreshTokens).where(eq(refreshTokens.tokenHash, hash)).limit(1)

  if (!row) return null
  if (row.revokedAt) return null
  if (new Date(row.expiresAt) < new Date()) return null

  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, row.id))
  const newToken = await issueRefreshToken(row.userId)

  return { userId: row.userId, token: newToken }
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  const hash = hashToken(raw)
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.tokenHash, hash))
}

export function verifyAccessToken(token: string): TokenPayload & { iat: number; exp: number } {
  return jwt.verify(token, process.env.JWT_SECRET!) as any
}

const REFRESH_COOKIE_NAME = 'refreshToken'

export function setRefreshCookie(res: import('express').Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  })
}

export function clearRefreshCookie(res: import('express').Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/v1/auth' })
}

// /refresh checks the cookie first (web), falls back to the request body (mobile — no cookie jar).
export function readRefreshToken(req: import('express').Request): string | null {
  return (req as any).cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken || null
}
