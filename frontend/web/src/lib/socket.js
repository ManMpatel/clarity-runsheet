import { io } from 'socket.io-client'

/**
 * Ref-counted socket.io singleton.
 *
 * The previous hook kept `let socket` at module scope and called `socket.disconnect()` in its
 * cleanup. That was fine while LiveMap was the only consumer, but the moment a second component
 * mounts the hook (the topbar's connection indicator, the dashboard), the first one to unmount
 * tears down the connection for everyone still listening. Ref-counting here means the socket
 * only closes when the last consumer releases it.
 */

let socket = null
let refCount = 0
let joinedCompanyId = null
let status = 'disconnected'   // 'connecting' | 'connected' | 'disconnected'

const statusListeners = new Set()

function setStatus(next) {
  if (status === next) return
  status = next
  statusListeners.forEach(fn => fn(status))
}

export function getSocketStatus() {
  return status
}

export function getSocket() {
  if (socket) return socket

  setStatus('connecting')
  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001', {
    // Explicit reconnection so a flaky mobile connection recovers on its own rather than sitting
    // silently dead behind a green indicator.
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  socket.on('connect', () => {
    setStatus('connected')
    // Re-join on every (re)connect: rooms are per-connection server-side, so a reconnect that
    // skipped this would silently stop delivering updates.
    if (joinedCompanyId) socket.emit('join:company', joinedCompanyId)
  })
  socket.on('disconnect', () => setStatus('disconnected'))
  socket.io.on('reconnect_attempt', () => setStatus('connecting'))
  socket.on('connect_error', () => setStatus('disconnected'))

  return socket
}

export function joinCompany(companyId) {
  if (!companyId) return
  joinedCompanyId = companyId
  const s = getSocket()
  if (s.connected) s.emit('join:company', companyId)
}

/** Subscribe to a server event. Returns an unsubscribe function. */
export function onSocketEvent(event, handler) {
  const s = getSocket()
  s.on(event, handler)
  return () => s.off(event, handler)
}

export function onConnectionStatus(handler) {
  statusListeners.add(handler)
  handler(status)
  return () => statusListeners.delete(handler)
}

/** Called by consumers on mount. */
export function retainSocket() {
  refCount += 1
  return getSocket()
}

/** Called by consumers on unmount. Only the last release actually disconnects. */
export function releaseSocket() {
  refCount = Math.max(0, refCount - 1)
  if (refCount === 0 && socket) {
    socket.disconnect()
    socket = null
    joinedCompanyId = null
    setStatus('disconnected')
  }
}

/** Full teardown for logout — drops the connection regardless of outstanding consumers. */
export function destroySocket() {
  refCount = 0
  if (socket) {
    socket.disconnect()
    socket = null
  }
  joinedCompanyId = null
  setStatus('disconnected')
}
