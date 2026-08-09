// @ts-nocheck
// Reworked from the original tcp-listener/parser/buffer.js to fix an O(n^2)
// pattern: the old version called Buffer.concat(this.incomplete, chunk) on
// EVERY incoming TCP chunk, so a packet arriving across many small cellular
// segments got its already-buffered bytes fully recopied on each new segment.
// This version just appends chunks to a list (O(1) per chunk) and only
// concatenates once — when there's finally enough total length to slice out
// a complete packet. External behaviour (feed()/reset() signatures, resync
// logic, packet boundaries) is unchanged.
const MINIMUM_PACKET_SIZE = 12
const HEADER_SIZE = 8 // preamble(4) + dataLength(4) — enough to know a packet's total size

class BufferStitcher {
  constructor() {
    this.chunks = []
    this.length = 0
  }

  feed(chunk) {
    this.chunks.push(chunk)
    this.length += chunk.length
    const packets = []

    while (this.length >= MINIMUM_PACKET_SIZE) {
      const header = this._peek(HEADER_SIZE)
      const preamble = header.readUInt32BE(0)

      if (preamble !== 0x00000000) {
        const buffer = this._materialize()
        const validStart = this._findPreamble(buffer)
        if (validStart === -1) {
          this._replace(Buffer.alloc(0))
          break
        }
        this._replace(buffer.slice(validStart))
        continue
      }

      const dataLength = header.readUInt32BE(4)
      const totalPacketSize = HEADER_SIZE + dataLength + 4

      if (this.length < totalPacketSize) break

      const buffer = this._materialize()
      packets.push(buffer.slice(0, totalPacketSize))
      this._replace(buffer.slice(totalPacketSize))
    }

    return packets
  }

  // Cheap path: the first pending chunk alone almost always already covers
  // the header, so we can read it without concatenating anything.
  _peek(size) {
    if (this.chunks.length && this.chunks[0].length >= size) {
      return this.chunks[0]
    }
    return this._materialize()
  }

  _materialize() {
    const buffer = this.chunks.length === 1 ? this.chunks[0] : Buffer.concat(this.chunks, this.length)
    this.chunks = [buffer]
    return buffer
  }

  _replace(buffer) {
    this.chunks = buffer.length ? [buffer] : []
    this.length = buffer.length
  }

  _findPreamble(buf) {
    for (let i = 1; i < buf.length - 3; i++) {
      if (buf.readUInt32BE(i) === 0x00000000) return i
    }
    return -1
  }

  reset() {
    this.chunks = []
    this.length = 0
  }
}

module.exports = BufferStitcher
