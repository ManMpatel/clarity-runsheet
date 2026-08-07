import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export function useSocket(onVanUpdate) {
  const companyId   = useAuthStore(s => s.companyId)
  const callbackRef = useRef(onVanUpdate)

  useEffect(() => {
    callbackRef.current = onVanUpdate
  })

  useEffect(() => {
    if (!companyId) return

    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001')

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