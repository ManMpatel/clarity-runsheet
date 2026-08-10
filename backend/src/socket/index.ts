// @ts-nocheck — relocated from worker/broadcaster/socketio.js, unchanged. Still instantiated by
// the ingestion entrypoint (not api), matching current process ownership: ingestion is where
// telemetry updates and alerts originate, so it emits in-process rather than needing a
// cross-process call into api just to broadcast. Works identically for the web dashboard and the
// Expo app's socket.io-client (same protocol) while either app is open — see notifications/push.ts
// for the closed-app path.
const { Server } = require('socket.io')
const http = require('http')
const { verifyAccessToken } = require('../modules/auth/services/tokens')

let io = null

function init() {
  const httpServer = http.createServer()

  // Same origin allowlist as the api entrypoint: comma-separated env lists, plus any localhost
  // port outside production (Vite moves to 5174+ when 5173 is taken).
  const allowedOrigins = [process.env.CORS_ORIGINS, process.env.WEB_URL, process.env.DASHBOARD_URL]
    .filter(Boolean)
    .flatMap((v) => v.split(','))
    .map((v) => v.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const isProd = process.env.NODE_ENV === 'production'
  const localhostOrigin = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true)
        if (!isProd && localhostOrigin.test(origin)) return callback(null, true)
        return callback(new Error(`Origin not allowed by CORS: ${origin}`))
      },
      methods: ['GET', 'POST'],
      credentials: true
    }
  })

  // SECURITY: the room a socket joins used to be whatever `companyId` the client passed to
  // `join:company` — completely unauthenticated, so any client could stream any tenant's live
  // GPS positions and alerts just by guessing/enumerating a UUID. The room is now derived from
  // a verified access token at handshake time and joined server-side; the client can no longer
  // choose which company's data it receives.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
      || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '')

    if (!token) return next(new Error('Authentication required'))

    try {
      const decoded = verifyAccessToken(token)
      if (!decoded.companyId) return next(new Error('No company context'))
      socket.companyId = decoded.companyId
      socket.userId = decoded.userId
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`[Socket.io] Client connected: ${socket.id} (company:${socket.companyId})`)
    socket.join(`company:${socket.companyId}`)

    // Kept as a no-op for backward compatibility with older clients that still emit this on
    // connect — the room is already joined above from the token, so the argument is ignored.
    socket.on('join:company', () => {})

    socket.on('disconnect', () => {
      console.log('[Socket.io] Client disconnected:', socket.id)
    })
  })

  const port = process.env.SOCKET_PORT || 3001
  httpServer.listen(port, () => {
    console.log(`[Socket.io] Broadcasting on port ${port}`)
  })

  return io
}

function broadcastVanUpdate(companyId, vanData) {
  if (!io) return
  io.to(`company:${companyId}`).emit('van:update', vanData)
}

function broadcastAlert(companyId, alert) {
  if (!io) return
  io.to(`company:${companyId}`).emit('alert:new', alert)
}

function getIo() {
  return io
}

// `export {}` (not `module.exports =`) so TS recognizes this file as an ES module for importers
// even under @ts-nocheck — module.exports assignments aren't reliably picked up as an export
// shape by files that import this one without their own @ts-nocheck.
export { init, broadcastVanUpdate, broadcastAlert, getIo }

