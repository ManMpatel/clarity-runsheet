// @ts-nocheck
// Handles outbound device commands (relay cut/restore) sent by the API.
//
// REWRITTEN from Redis Pub/Sub to a small internal HTTP server. The API
// process and tcp-listener process both live inside the same `backend/`
// package now but still run as separate deployables, so they still need a
// cross-process transport for this — Redis is being eliminated everywhere
// except the telemetry_queue handoff, so pub/sub isn't an option any more.
//
// Everything downstream of "a command arrived" is untouched: same socket
// registry lookup, same Codec 12 packet encoding, same ACK recording shape
// (now an in-memory Map with a TTL sweep instead of a Redis SETEX key).
const http = require('http')
const socketRegistry = require('../registry/sockets')
const { encodeRelayCommand } = require('../parser/codec12')
const { getUsageSnapshot } = require('../metrics/usage')

const INTERNAL_PORT = process.env.TCP_INTERNAL_PORT || 4001
const RESPONSE_TTL_MS = 60 * 1000

// imei -> { command, sentAt, status: 'pending'|'acked'|'timeout', response?, respondedAt? }
const commandStatus = new Map()

function startCommandListener() {
  const server = http.createServer((req, res) => {
    handleRequest(req, res)
  })

  server.listen(INTERNAL_PORT, () => {
    console.log(`[Commands] Internal HTTP server listening on port ${INTERNAL_PORT}`)
  })

  server.on('error', (err) => {
    console.error('[Commands] Internal HTTP server error:', err.message)
  })

  return server
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${INTERNAL_PORT}`)
  const parts = url.pathname.split('/').filter(Boolean) // ['internal','commands',':imei', ...]

  // Rolling per-IMEI byte/record/CRC-failure counters — see metrics/usage.ts.
  // Diagnostic snapshot for confirming actual SIM data usage per device, not a
  // billing record (in-memory, resets on restart).
  if (req.method === 'GET' && parts[0] === 'internal' && parts[1] === 'metrics' && parts.length === 2) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(getUsageSnapshot()))
    return
  }

  if (parts[0] !== 'internal' || parts[1] !== 'commands' || !parts[2]) {
    res.writeHead(404, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'not found' }))
    return
  }

  const imei = parts[2]

  if (req.method === 'POST' && parts.length === 3) {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      let action
      try {
        ;({ action } = JSON.parse(body || '{}'))
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'bad JSON body' }))
        return
      }
      sendCommand(imei, action, res)
    })
    return
  }

  if (req.method === 'GET' && parts[3] === 'status') {
    const entry = commandStatus.get(imei)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(entry || { status: 'unknown' }))
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'not found' }))
}

function sendCommand(imei, action, res) {
  if (action !== 'cut' && action !== 'restore') {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: `unknown action: ${action}` }))
    return
  }

  const socket = socketRegistry.getSocket(imei)
  if (!socket) {
    console.warn(`[Command] No active connection for ${imei}, cannot send ${action}`)
    res.writeHead(409, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'device not connected' }))
    return
  }

  const packet = encodeRelayCommand(action === 'cut')
  socket.write(packet)
  console.log(`[Command] Sent ${action} to ${imei}`)

  const entry = { command: action, sentAt: Date.now(), status: 'pending' }
  commandStatus.set(imei, entry)
  scheduleCleanup(imei)

  res.writeHead(202, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'pending' }))
}

function scheduleCleanup(imei) {
  setTimeout(() => {
    const entry = commandStatus.get(imei)
    if (entry && entry.status === 'pending') {
      entry.status = 'timeout'
    }
    // Prune entirely a bit after TTL so a slow poller can still observe 'timeout'.
    setTimeout(() => {
      const current = commandStatus.get(imei)
      if (current && current.status !== 'pending') commandStatus.delete(imei)
    }, RESPONSE_TTL_MS)
  }, RESPONSE_TTL_MS)
}

// Stores the device's reply to a command, briefly, so the API can check
// whether a cut/restore actually got acknowledged shortly after sending it.
// Same purpose as the old Redis `device:lastResponse:{imei}` key — now an
// in-memory Map entry updated in place instead of a separate Redis SETEX.
async function recordResponse(imei, responseText) {
  const entry = commandStatus.get(imei)
  if (entry) {
    entry.status = 'acked'
    entry.response = responseText
    entry.respondedAt = Date.now()
  } else {
    // Device replied without a tracked pending command (e.g. after a
    // tcp-listener restart) — still record it so a poller sees something.
    commandStatus.set(imei, {
      command: null,
      status: 'acked',
      response: responseText,
      respondedAt: Date.now(),
    })
  }
}

module.exports = { startCommandListener, recordResponse }
