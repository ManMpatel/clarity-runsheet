require('dotenv').config()
const net = require('net')
const BufferStitcher = require('./parser/buffer')
const { parseCodec8 } = require('./parser/codec8')
const { parseCodec8E } = require('./parser/codec8e')
const { verifyCRC } = require('./parser/crc16')
const { pushToQueue, setCurrentVanState } = require('./queue/redis')
const socketRegistry = require('./registry/sockets')
const { startCommandListener, recordResponse } = require('./queue/commands')
const { decodeResponse } = require('./parser/codec12')

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
          socket.write(Buffer.from([0x01]))
        } else {
          console.warn(`[TCP] IMEI parse failed — buffer length: ${chunk.length}`)
        }
        return
      }

      const packets = stitcher.feed(chunk)

      for (const packet of packets) {
        if (!verifyCRC(packet)) {
          console.warn(`[TCP] CRC check failed for IMEI ${imei}`)
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

        if (records.length === 0) continue

        await pushToQueue(records, imei)

        const latest = records[records.length - 1]
        await setCurrentVanState(imei, null, latest)

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