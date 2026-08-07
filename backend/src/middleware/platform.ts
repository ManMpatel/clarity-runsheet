// New. Reads X-Platform (default 'web', for backward compatibility with the current dashboard
// which doesn't send it) and X-App-Version on every request. X-App-Version drives a 426 Upgrade
// Required JSON response for mobile builds older than MIN_SUPPORTED_MOBILE_VERSION, so an old
// mobile build hits a clear versioned error instead of routes it wasn't built for.
import type { Request, Response, NextFunction } from 'express'

declare global {
  namespace Express {
    interface Request {
      platform: string
      appVersion: string | null
    }
  }
}

function parseVersion(v: string): number[] {
  return v.split('.').map((n) => parseInt(n, 10) || 0)
}

function isOlder(a: string, b: string): boolean {
  const pa = parseVersion(a)
  const pb = parseVersion(b)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y
  }
  return false
}

const MIN_SUPPORTED_MOBILE_VERSION = process.env.MIN_SUPPORTED_MOBILE_VERSION || '1.0.0'

export function platform(req: Request, res: Response, next: NextFunction) {
  req.platform = (req.headers['x-platform'] as string) || 'web'
  req.appVersion = (req.headers['x-app-version'] as string) || null

  const isMobile = req.platform === 'ios' || req.platform === 'android'
  if (isMobile && req.appVersion && isOlder(req.appVersion, MIN_SUPPORTED_MOBILE_VERSION)) {
    return res.status(426).json({
      success: false,
      message: 'Upgrade required',
      data: null,
      errors: [{ minVersion: MIN_SUPPORTED_MOBILE_VERSION }],
    })
  }

  next()
}
