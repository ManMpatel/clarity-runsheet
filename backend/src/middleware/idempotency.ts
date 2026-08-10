// NEW — the `idempotency_keys` table (db/schema/misc.ts) has existed since the Phase 4 spec but
// nothing wrote or read it. Mobile clients retry mutating requests on flaky cellular connections
// (a request that actually succeeded server-side but timed out client-side looks identical to one
// that never arrived), and without this a retry double-creates whatever the route created —
// vehicles, drivers, maintenance records, upgrade requests, Stripe checkout sessions.
//
// Contract: the client sends an `Idempotency-Key` header (a client-generated UUID, one per
// logical submit — the same key on every retry of that submit). First request executes the route
// normally and its response is cached against the key; any retry with the same key + same user
// replays the cached response without re-running the handler. No Redis involved — see the
// schema comment on why this lives in Postgres instead.
import type { Request, Response, NextFunction } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/client'
import { idempotencyKeys } from '../db/schema'

const HEADER = 'idempotency-key'

export function idempotent(req: Request, res: Response, next: NextFunction) {
  const rawKey = req.headers[HEADER]
  // Not sent: not every client opts in (the web dashboard doesn't need this — a human clicking
  // "Save" twice is a deliberate second request, not a network retry). Proceed normally.
  if (!rawKey || typeof rawKey !== 'string') return next()

  const userId = req.user?.userId
  if (!userId) return next() // requireAuth should already have rejected this, but don't crash here

  const scopedKey = `${userId}:${rawKey}`

  ;(async () => {
    const [existing] = await db.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, scopedKey)).limit(1)

    if (existing) {
      if (existing.response) {
        const cached = existing.response as { status: number; body: unknown }
        return res.status(cached.status).json(cached.body)
      }
      // A row exists but has no response yet: either a concurrent request with the same key is
      // still in flight, or an earlier attempt crashed before recording one. Either way, running
      // the handler again right now risks a genuine duplicate — ask the client to back off and
      // retry the read instead of the mutation.
      return res.fail(null, 'A request with this idempotency key is already in progress', 409)
    }

    try {
      await db.insert(idempotencyKeys).values({ key: scopedKey, userId, response: null })
    } catch (err: any) {
      // Unique-constraint race: another request claimed the key between our SELECT and INSERT.
      // Treat it the same as "already in progress" above rather than double-running the handler.
      if (err.code === '23505') return res.fail(null, 'A request with this idempotency key is already in progress', 409)
      throw err
    }

    // Capture the handler's response and persist it against the claimed key, but only for
    // successful writes — caching a 4xx/5xx would permanently block a legitimate retry after a
    // real failure (e.g. a transient DB error) using the same key.
    const originalJson = res.json.bind(res)
    res.json = ((body: unknown) => {
      const status = res.statusCode
      if (status < 400) {
        db.update(idempotencyKeys).set({ response: { status, body } })
          .where(eq(idempotencyKeys.key, scopedKey))
          .catch((err) => console.error('[Idempotency] Failed to persist response:', err.message))
      } else {
        db.delete(idempotencyKeys).where(eq(idempotencyKeys.key, scopedKey))
          .catch((err) => console.error('[Idempotency] Failed to release key after error:', err.message))
      }
      return originalJson(body)
    }) as typeof res.json

    next()
  })().catch(next)
}
