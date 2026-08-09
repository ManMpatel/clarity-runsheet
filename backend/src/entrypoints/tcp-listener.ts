// @ts-nocheck — relocated verbatim from tcp-listener/index.js. Only changes:
// import paths (module now lives under modules/tcp-listener/) and removal of
// the setCurrentVanState() Redis cache write (see queue/redis.ts for why).
require('dotenv').config()
const net = require('net')
const BufferStitcher = require('../modules/tcp-listener/parser/buffer')
const { parseCodec8 } = require('../modules/tcp-listener/parser/codec8')
const { parseCodec8E } = require('../modules/tcp-listener/parser/codec8e')
const { verifyCRC } = require('../modules/tcp-listener/parser/crc16')
const { pushToQueue } = require('../modules/tcp-listener/queue/redis')
const socketRegistry = require('../modules/tcp-listener/registry/sockets')
const { startCommandListener, recordResponse } = require('../modules/tcp-listener/queue/commands')
const { decodeResponse } = require('../modules/tcp-listener/parser/codec12')
const usageMetrics = require('../modules/tcp-listener/metrics/usage')

const PORT = process.env.TCP_PORT || 5027

const server = net.createServer((socket) => {
  const stitcher = new BufferStitcher()
  let imei = null

  console.log(`[TCP] New connection: ${socket.remoteAddress}`)

  socket.on('data', async (chunk) => {
    try {
      if (!imei) {
        console.log(`[TCP] Raw IMEI packet from ${socket.remoteAddress}: ${chunk.toString('hex')}`)
        imei = parseImei(chunk)
        if (imei) {
          console.log(`[TCP] Device identified: ${imei}`)
          socketRegistry.register(imei, socket)
          usageMetrics.recordReconnect(imei)
          usageMetrics.recordBytes(imei, chunk.length)
          socket.write(Buffer.from([0x01]))
        } else {
          console.warn(`[TCP] IMEI parse failed — buffer length: ${chunk.length}`)
        }
        return
      }

      usageMetrics.recordBytes(imei, chunk.length)

      const packets = stitcher.feed(chunk)

      for (const packet of packets) {
        if (!verifyCRC(packet)) {
          console.warn(`[TCP] CRC check failed for IMEI ${imei}`)
          usageMetrics.recordCrcFailure(imei)
          continue
        }

        const codecId = packet[8]
        let records = []

        if (codecId === 0x08) {
          records = parseCodec8(packet)
        } else if (codecId === 0x8E) {
          records = parseCodec8E(packet)
        } else if (codecId === 0x0C) {
          const responseText = decodeResponse(packet)
          if (responseText) {
            console.log(`[Command] Response from ${imei}: ${responseText}`)
            await recordResponse(imei, responseText)
          }
          continue
        } else {
          console.warn(`[TCP] Unknown codec ${codecId} for IMEI ${imei}`)
          continue
        }

        usageMetrics.recordPacket(imei, records.length)

        if (records.length === 0) continue

        await pushToQueue(records, imei)

        const ack = Buffer.alloc(4)
        ack.writeUInt32BE(records.length, 0)
        socket.write(ack)

        console.log(`[TCP] IMEI ${imei} — ${records.length} records queued`)
      }
    } catch (err) {
      console.error(`[TCP] Parse error for IMEI ${imei}:`, err.message)
    }
  })

  socket.on('close', () => {
    console.log(`[TCP] Disconnected: ${imei || socket.remoteAddress}`)
    if (imei) socketRegistry.unregister(imei, socket)
    stitcher.reset()
  })

  socket.on('error', (err) => {
    console.error(`[TCP] Socket error:`, err.message)
  })
})

function parseImei(buffer) {
  if (buffer.length < 2) return null
  const length = buffer.readUInt16BE(0)
  if (buffer.length < 2 + length) return null
  return buffer.slice(2, 2 + length).toString('ascii')
}

server.listen(PORT, () => {
  console.log(`[TCP] Listener running on port ${PORT}`)
  startCommandListener()
})

server.on('error', (err) => {
  console.error('[TCP] Server error:', err.message)
})