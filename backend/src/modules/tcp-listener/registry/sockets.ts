// @ts-nocheck — relocated verbatim from tcp-listener/registry/sockets.js, zero logic diff.
// Tracks currently-connected device sockets by IMEI, so outbound
// commands (e.g. relay cut/restore) know which connection to write to.
// In-memory only — resets if the process restarts, which is fine since
// devices reconnect on their own and re-register within seconds.

const sockets = new Map()

function register(imei, socket) {
  const existing = sockets.get(imei)
  if (existing && existing !== socket) {
    console.log(`[Registry] Replacing stale connection for ${imei}`)
    existing.destroy()
  }
  sockets.set(imei, socket)
  console.log(`[Registry] Registered ${imei} (${sockets.size} active)`)
}

function unregister(imei, socket) {
  if (sockets.get(imei) === socket) {
    sockets.delete(imei)
    console.log(`[Registry] Unregistered ${imei} (${sockets.size} active)`)
  }
}

function getSocket(imei) {
  return sockets.get(imei) || null
}

function isConnected(imei) {
  return sockets.has(imei)
}

module.exports = { register, unregister, getSocket, isConnected }