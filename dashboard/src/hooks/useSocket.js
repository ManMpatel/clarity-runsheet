import { useEffect } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../store/authStore'

let socket = null

export function useSocket(onVanUpdate) {
  const companyId = useAuthStore(s => s.companyId)

  useEffect(() => {
    if (!companyId) return

    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001')

    socket.on('connect', () => {
      socket.emit('join:company', companyId)
    })

    socket.on('van:update', (data) => {
      if (onVanUpdate) onVanUpdate(data)
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [companyId])
}