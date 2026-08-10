import { io } from 'socket.io-client'
import { AppState } from 'react-native'
import { getAccessToken } from './api'

// Ref-counted singleton, mirroring frontend/web/src/lib/socket.js (same reasoning: the moment a
// second consumer — the Map screen and the tab-bar unread badge both want `van:update`/
// `alert:new` — mounts the old per-hook socket, the first one to unmount would tear down the
// connection for everyone still listening).
//
// The server authenticates the handshake and derives the room from the token itself (see
// backend/src/socket/index.ts) — there is no client-chosen room any more, so there's nothing to
// `emit('join:company', …)` here, unlike the pre-rebuild version of this file.
let socket = null
let refCount = 0
let status = 'disconnected' // 'connecting' | 'connected' | 'disconnected'

const statusListeners = new Set()

function setStatus(next) {
  if (status === next) return
  status = next
  statusListeners.forEach((fn) => fn(status))
}

export function getSocketStatus() {
  return status
}

export function getSocket() {
  if (socket) return socket

  setStatus('connecting')
  socket = io(process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001', {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    // Re-evaluated by socket.io-client on every (re)connect attempt, so a token refreshed while
    // the app was backgrounded is picked up automatically on the next reconnect.
    auth: (cb) => cb({ token: getAccessToken() }),
  })

  socket.on('connect', () => setStatus('connected'))
  socket.on('disconnect', () => setStatus('disconnected'))
  socket.io.on('reconnect_attempt', () => setStatus('connecting'))
  socket.on('connect_error', () => setStatus('disconnected'))

  return socket
}

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

export function retainSocket() {
  refCount += 1
  return getSocket()
}

export function releaseSocket() {
  refCount = Math.max(0, refCount - 1)
  if (refCount === 0 && socket) {
    socket.disconnect()
    socket = null
    setStatus('disconnected')
  }
}

export function destroySocket() {
  refCount = 0
  if (socket) {
    socket.disconnect()
    socket = null
  }
  setStatus('disconnected')
}

// A backgrounded RN app's socket eventually dies at the OS level anyway, but disconnecting
// explicitly on background and reconnecting on foreground avoids sitting on a half-dead
// connection for however long the OS takes to notice, and avoids a phone silently burning
// battery/data on a socket nobody's looking at.
AppState.addEventListener('change', (next) => {
  if (!socket) return
  if (next === 'background' && socket.connected) {
    socket.disconnect()
  } else if (next === 'active' && !socket.connected && refCount > 0) {
    socket.connect()
  }
})
