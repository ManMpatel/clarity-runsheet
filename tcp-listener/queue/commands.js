// Subscribes to a Redis channel for outbound device commands.
// The API server publishes {imei, action} here; this process looks up
// the device's active socket and sends the actual Codec 12 packet.
// Needs its own dedicated Redis connection — a connection in subscriber
// mode can't run other commands, so this can't share the client in
// queue/redis.js.

const Redis = require('ioredis')
const socketRegistry = require('../registry/sockets')
const { encodeRelayCommand } = require('../parser/codec12')
const { getClient } = require('./redis')

const CHANNEL = 'device:commands'

function startCommandListener() {
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 10) return null
      return Math.min(times * 200, 2000)
    }
  })

  subscriber.on('connect', () => console.log('[Redis] Command listener connected'))
  subscriber.on('error', (err) => console.error('[Redis] Command listener error:', err.message))

  subscriber.subscribe(CHANNEL, (err) => {
    if (err) console.error('[Redis] Failed to subscribe:', err.message)
    else console.log(`[Redis] Subscribed to ${CHANNEL}`)
  })

  subscriber.on('message', (channel, message) => {
    if (channel !== CHANNEL) return
    handleCommand(message)
  })
}

function handleCommand(message) {
  let imei, action

  try {
    ;({ imei, action } = JSON.parse(message))
  } catch (err) {
    console.error('[Command] Bad message format:', err.message)
    return
  }

  if (action !== 'cut' && action !== 'restore') {
    console.warn(`[Command] Unknown action: ${action}`)
    return
  }

  const socket = socketRegistry.getSocket(imei)
  if (!socket) {
    console.warn(`[Command] No active connection for ${imei}, cannot send ${action}`)
    return
  }

  const packet = encodeRelayCommand(action === 'cut')
  socket.write(packet)
  console.log(`[Command] Sent ${action} to ${imei}`)
}

// Stores the device's reply to a command, briefly, so the API can check
// whether a cut/restore actually got acknowledged shortly after sending it.
async function recordResponse(imei, responseText) {
  const redis = getClient()
  const payload = JSON.stringify({ response: responseText, receivedAt: Date.now() })
  await redis.set(`device:lastResponse:${imei}`, payload, 'EX', 60)
}

module.exports = { startCommandListener, handleCommand, recordResponse, CHANNEL }