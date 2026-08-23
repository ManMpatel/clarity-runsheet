// New — the old api had no consistent response shape (success payloads were raw objects,
// errors were ad-hoc {error: 'msg'}). Every /api/v1/* route now goes through res.success()/
// res.fail(), and any thrown/next(err) error is caught by errorHandler below and formatted the
// same way — no HTML error pages, no redirects, ever, under /api/v1/*.
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Response {
      success: (data?: unknown, message?: string) => Response
      fail: (errors?: unknown, message?: string, status?: number) => Response
    }
  }
}

export function responseEnvelope(req: Request, res: Response, next: NextFunction) {
  res.success = (data: unknown = null, message = 'OK') => {
    return res.json({ success: true, message, data, errors: null })
  }
  res.fail = (errors: unknown = null, message = 'Error', status = 400) => {
    return res.status(status).json({ success: false, message, data: null, errors })
  }
  next()
}

export class ApiError extends Error {
  status: number
  errors: unknown
  constructor(status: number, message: string, errors: unknown = null) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

// Mounted last, after every route. Anything thrown in a route (sync or via next(err) from an
// async handler) lands here instead of Express's default HTML error page.
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err)

  console.error('[API] Unhandled error:', err?.message || err)

  if (err instanceof ApiError) {
    if (typeof res.fail === 'function') return res.fail(err.errors, err.message, err.status)
    return res.status(err.status).json({ success: false, message: err.message, data: null, errors: err.errors })
  }

  if (typeof res.fail === 'function') return res.fail(null, 'Server error', 500)
  return res.status(500).json({ success: false, message: 'Server error', data: null, errors: null })
}

// Wraps an async route handler so a rejected promise reaches errorHandler instead of crashing
// the process / hanging the request — Express 5 does auto-catch async errors, but this keeps
// the intent explicit and works the same regardless of Express version.
export function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
