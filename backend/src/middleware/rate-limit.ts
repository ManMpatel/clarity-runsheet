// Rewritten on express-rate-limit (was a hand-rolled Map, same in-memory-only behavior).
// In-memory store is fine for the current single-VPS, single-process-per-entrypoint deployment.
// FUTURE ITEM (not addressed now): if the api entrypoint is ever horizontally scaled to multiple
// instances, this in-memory store won't share state across them and effectively becomes N
// independent rate limiters — would need a shared store (e.g. Redis) at that point. Deliberately
// not doing that now since the spec calls for eliminating Redis outside the telemetry handoff.
import rateLimit from 'express-rate-limit'
import type { Request } from 'express'

function keyGenerator(req: Request) {
  return (req as any).user?.companyId || req.ip
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
