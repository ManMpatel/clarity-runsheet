import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

// Mirrors frontend/web/src/hooks/useSocket.js — same server, same events (`join:company` on
// connect, `van:update` payloads), just company id sourced from the mobile authStore instead of
// the web one. The socket.io broadcaster runs as its own standalone server (backend/src/socket/
// index.ts, default port 3001), separate from the REST API's origin/port, so it needs its own
// env var rather than reusing EXPO_PUBLIC_API_URL.
let socket = null

export function useSocket(onVanUpdate) {
  const companyId   = useAuthStore(s => s.companyId)
  const callbackRef = useRef(onVanUpdate)

  useEffect(() => {
    callbackRef.current = onVanUpdate
  })

  useEffect(() => {
    if (!companyId) return

    socket = io(process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001')

    socket.on('connect', () => {
      socket.emit('join:company', companyId)
    })

    socket.on('van:update', (data) => {
      if (callbackRef.current) callbackRef.current(data)
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [companyId])
}
