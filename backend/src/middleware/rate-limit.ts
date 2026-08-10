// Rewritten on express-rate-limit (was a hand-rolled Map, same in-memory-only behavior).
// In-memory store is fine for the current single-VPS, single-process-per-entrypoint deployment.
// FUTURE ITEM (not addressed now): if the api entrypoint is ever horizontally scaled to multiple
// instances, this in-memory store won't share state across them and effectively becomes N
// independent rate limiters — would need a shared store (e.g. Redis) at that point. Deliberately
// not doing that now since the spec calls for eliminating Redis outside the telemetry handoff.
import rateLimit from 'express-rate-limit'
import type { Request } from 'express'
import { verifyAccessToken } from '../modules/auth/services/tokens'

// `apiRateLimit` is mounted at api.ts before any route's `requireAuth` runs, so `req.user` is
// never populated by the time this fires — the previous `req.user?.companyId || req.ip` always
// fell through to `req.ip`. With no `app.set('trust proxy', …)` (now fixed, see api.ts) every
// request behind nginx also resolved to the same proxy IP, so the entire user base shared one
// 100 req/min bucket. Decoding the bearer token here directly (best-effort — an invalid/expired
// token just falls back to IP, same as before) keys each authenticated user independently of
// both IP and any auth middleware ordering, and also stops carrier-grade NAT from lumping
// unrelated mobile users into the same bucket.
function keyGenerator(req: Request) {
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = verifyAccessToken(header.slice('Bearer '.length))
      if (decoded.userId) return `user:${decoded.userId}`
    } catch {
      // fall through to IP
    }
  }
  return `ip:${req.ip}`
}

// General API traffic.
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 100,
  keyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.fail(null, 'Too many requests', 429),
})

// Stricter limit for auth endpoints (login/signup/forgot-password) — these are the ones worth
// throttling harder since they're the credential-guessing surface.
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  keyGenerator: (req) => req.ip!,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.fail(null, 'Too many requests', 429),
})
