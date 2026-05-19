const rateLimitMap = new Map()

const WINDOW_MS = 60 * 1000
const MAX_REQUESTS = 100

function rateLimiter(req, res, next) {
  const key = req.companyId || req.ip
  const now = Date.now()
  const record = rateLimitMap.get(key)

  if (!record || now - record.start > WINDOW_MS) {
    rateLimitMap.set(key, { start: now, count: 1 })
    return next()
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  record.count++
  next()
}

module.exports = { rateLimiter }