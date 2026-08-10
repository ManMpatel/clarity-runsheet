import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

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
    // The server now authenticates the handshake and derives the room from the token itself
    // (see backend/src/socket/index.ts) rather than trusting a client-supplied companyId. `auth`
    // is re-evaluated by socket.io-client on every (re)connect attempt, so a token refreshed
    // between disconnects is picked up automatically without any extra wiring here.
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  })

  socket.on('connect', () => setStatus('connected'))
  socket.on('disconnect', () => setStatus('disconnected'))
  socket.io.on('reconnect_attempt', () => setStatus('connecting'))
  socket.on('connect_error', () => setStatus('disconnected'))

  return socket
}

// Retained only so existing call sites don't need to change; the room is now derived
// server-side from the authenticated token, so this no longer needs to emit anything.
export function joinCompany(companyId) {
  joinedCompanyId = companyId
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
