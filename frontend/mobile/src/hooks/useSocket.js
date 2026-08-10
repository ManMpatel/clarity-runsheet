import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { retainSocket, releaseSocket, onSocketEvent, onConnectionStatus, getSocketStatus } from '../lib/socket'

/**
 * Subscribes to the company's realtime room for the lifetime of the calling component. Mirrors
 * frontend/web/src/hooks/useSocket.js's useFleetSocket — same events (`van:update`, `alert:new`),
 * same ref-counted retain/release pattern so multiple screens (Map, the Alerts tab badge) can
 * hold the connection open simultaneously without one unmounting and killing it for the other.
 */
export function useFleetSocket({ onVanUpdate, onAlert } = {}) {
  const companyId = useAuthStore((s) => s.companyId)
  const [status, setStatus] = useState(getSocketStatus)

  const vanRef = useRef(onVanUpdate)
  const alertRef = useRef(onAlert)
  useEffect(() => { vanRef.current = onVanUpdate })
  useEffect(() => { alertRef.current = onAlert })

  useEffect(() => {
    if (!companyId) return undefined

    retainSocket()

    const offStatus = onConnectionStatus(setStatus)
    const offVan = onSocketEvent('van:update', (data) => vanRef.current?.(data))
    const offAlert = onSocketEvent('alert:new', (data) => alertRef.current?.(data))

    return () => {
      offStatus()
      offVan()
      offAlert()
      releaseSocket()
    }
  }, [companyId])

  return status
}

// Back-compat single-callback form, kept because it reads slightly better at Map screen call
// sites that only care about van updates.
export function useSocket(onVanUpdate) {
  return useFleetSocket({ onVanUpdate })
}

export default useSocket
