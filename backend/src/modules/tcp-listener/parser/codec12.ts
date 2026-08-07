// @ts-nocheck — relocated verbatim from tcp-listener/parser/codec12.js, zero logic diff.
// Encodes outbound Codec 12 GPRS commands (server -> device).
// Verified byte-for-byte against Teltonika's documented "getinfo" example.
// Structure: preamble(4) + dataSize(4) + codecId(1) + cmdQty1(1) + type(1)
//            + cmdSize(4) + command(X) + cmdQty2(1) + crc16(4)

const { crc16 } = require('./crc16')

function encodeCommand(commandText) {
  const commandBuffer = Buffer.from(commandText, 'ascii')
  const commandSize = commandBuffer.length

  // Everything from Codec ID through Command Quantity 2 — this is what
  // both "Data Size" and the CRC are calculated over.
  const inner = Buffer.alloc(1 + 1 + 1 + 4 + commandSize + 1)
  let offset = 0
  inner.writeUInt8(0x0C, offset); offset += 1          // Codec ID
  inner.writeUInt8(0x01, offset); offset += 1          // Command Quantity 1
  inner.writeUInt8(0x05, offset); offset += 1          // Type: 0x05 = command
  inner.writeUInt32BE(commandSize, offset); offset += 4
  commandBuffer.copy(inner, offset); offset += commandSize
  inner.writeUInt8(0x01, offset)                        // Command Quantity 2

  const crc = crc16(inner)

  const packet = Buffer.alloc(4 + 4 + inner.length + 4)
  let p = 0
  packet.writeUInt32BE(0, p); p += 4          // Preamble
  packet.writeUInt32BE(inner.length, p); p += 4 // Data Size
  inner.copy(packet, p); p += inner.length
  packet.writeUInt32BE(crc, p)                 // CRC-16, padded to 4 bytes

  return packet
}

// Convenience helper for the relay use case specifically.
// state: true = cut (DOUT1 ON), false = restore (DOUT1 OFF)
// speedThreshold: device-level safety check, command only takes effect
// at or below this speed (km/h). Defaults to 0 — stationary only.
function encodeRelayCommand(state, speedThreshold = 0) {
  const value = state ? 1 : 0
  return encodeCommand(`setdigout ${value} ? ${speedThreshold}`)
}

// Decodes an inbound Codec 12 response packet (device -> server).
// Returns the response text, or null if this isn't actually a response
// (type byte should be 0x06 — 0x05 would mean somehow we received a
// command instead, which shouldn't happen on this side).
function decodeResponse(packet) {
  const type = packet[10]
  if (type !== 0x06) return null

  const responseSize = packet.readUInt32BE(11)
  return packet.slice(15, 15 + responseSize).toString('ascii')
}

module.exports = { encodeCommand, encodeRelayCommand, decodeResponse }