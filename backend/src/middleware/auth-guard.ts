// Consolidates the old api/middleware/auth.js (requireAuth/requireRole), requireCompany.js,
// requireTier.js, and superAdmin.js into one module — the old superAdmin.js duplicated the
// JWT-decode logic from auth.js instead of reusing it; that duplication is gone here.
import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type TokenPayload } from '../modules/auth/services/tokens'

declare global {
  namespace Express {
    // Augments Passport's own `Express.User` (declared by @types/passport as an empty
    // interface) rather than redeclaring `Request.user` directly — Passport already
    // declares `Request.user?: User`, so a separate `user?: TokenPayload` here would
    // conflict. `req.user` legitimately carries two different shapes depending on which
    // auth path populated it: requireAuth's JWT decode sets TokenPayload; the web Google
    // OAuth callback (passport.ts's `done(null, user)`) sets the full `users` DB row before
    // a token is even issued yet. Loosely typed rather than a strict union of the two,
    // since call sites already cast explicitly where they need a specific shape (see
    // routes/google.ts's callback handler).
    interface User extends Partial<TokenPayload> {
      [key: string]: any
    }
    interface Request {
      companyId?: string | null
      role?: string
      subscriptionTier?: string | null
      companyFilter?: { companyId: string }
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.fail(null, 'Missing token', 401)
  }

  const token = header.slice('Bearer '.length)

  try {
    const decoded = verifyAccessToken(token)
    req.user = decoded
    req.companyId = decoded.companyId
    req.role = decoded.role
    req.subscriptionTier = decoded.subscriptionTier
    next()
  } catch {
    return res.fail(null, 'Invalid token', 401)
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.role || !roles.includes(req.role)) {
      return res.fail(null, 'Insufficient permissions', 403)
    }
    next()
  }
}

export function requireCompany(req: Request, res: Response, next: NextFunction) {
  if (!req.companyId) {
    return res.fail(null, 'No company context', 403)
  }
  req.companyFilter = { companyId: req.companyId }
  next()
}

const TIER_LEVELS: Record<string, number> = { entry: 1, mid: 2, top: 3 }

export function requireTier(minTier: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userLevel = TIER_LEVELS[req.subscriptionTier || 'entry'] || 0
    const requiredLevel = TIER_LEVELS[minTier] || 0
    if (userLevel < requiredLevel) {
      return res.fail({ required: minTier, current: req.subscriptionTier }, 'Upgrade required', 403)
    }
    next()
  }
}

// Super admin is now just a role on the merged `users` table (see Phase 3 schema note) — same
// requireAuth check, plus a role check and a totp_verified claim check (set only by
// admin-auth.ts's verify-totp step, never by regular /auth/login).
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  requireAuth(req, res, (err?: unknown) => {
    if (err) return next(err)
    if (req.role !== 'superAdmin') {
      return res.fail(null, 'Super admin only', 403)
    }
    if (!(req.user as any)?.totp_verified) {
      return res.fail(null, 'TOTP verification required', 403)
    }
    next()
  })
}
