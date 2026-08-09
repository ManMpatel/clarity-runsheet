import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import {
  retainSocket, releaseSocket, joinCompany, onSocketEvent, onConnectionStatus, getSocketStatus,
} from '../lib/socket'

/**
 * Original single-callback signature, preserved so LiveMap.jsx keeps working untouched. New code
 * should prefer useFleetSocket below, which can also subscribe to alerts and connection state.
 */
export function useSocket(onVanUpdate) {
  useFleetSocket({ onVanUpdate })
}

/**
 * Subscribes to the company's realtime room.
 *
 * `alert:new` has been broadcast by the backend since the alerts pipeline was written and had no
 * client listener at all — wiring onAlert here is what makes the notification bell live.
 */
export function useFleetSocket({ onVanUpdate, onAlert } = {}) {
  const companyId = useAuthStore(s => s.companyId)
  const [status, setStatus] = useState(getSocketStatus)

  // Handlers are usually inline arrow functions, so keep them in refs and subscribe once per
  // companyId instead of tearing the listeners down on every parent render.
  const vanRef = useRef(onVanUpdate)
  const alertRef = useRef(onAlert)
  useEffect(() => { vanRef.current = onVanUpdate })
  useEffect(() => { alertRef.current = onAlert })

  useEffect(() => {
    if (!companyId) return undefined

    retainSocket()
    joinCompany(companyId)

    const offStatus = onConnectionStatus(setStatus)
    const offVan = onSocketEvent('van:update', data => vanRef.current?.(data))
    const offAlert = onSocketEvent('alert:new', data => alertRef.current?.(data))

    return () => {
      offStatus()
      offVan()
      offAlert()
      releaseSocket()
    }
  }, [companyId])

  return status
}

export default useSocket
