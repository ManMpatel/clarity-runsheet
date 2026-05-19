const MINIMUM_PACKET_SIZE = 12

class BufferStitcher {
  constructor() {
    this.incomplete = Buffer.alloc(0)
  }

  feed(chunk) {
    this.incomplete = Buffer.concat([this.incomplete, chunk])
    const packets = []

    while (this.incomplete.length >= MINIMUM_PACKET_SIZE) {
      const preamble = this.incomplete.readUInt32BE(0)

      if (preamble !== 0x00000000) {
        const validStart = this._findPreamble(this.incomplete)
        if (validStart === -1) {
          this.incomplete = Buffer.alloc(0)
          break
        }
        this.incomplete = this.incomplete.slice(validStart)
        continue
      }

      const dataLength = this.incomplete.readUInt32BE(4)
      const totalPacketSize = 8 + dataLength + 4

      if (this.incomplete.length < totalPacketSize) break

      const packet = this.incomplete.slice(0, totalPacketSize)
      this.incomplete = this.incomplete.slice(totalPacketSize)
      packets.push(packet)
    }

    return packets
  }

  _findPreamble(buf) {
    for (let i = 1; i < buf.length - 3; i++) {
      if (buf.readUInt32BE(i) === 0x00000000) return i
    }
    return -1
  }

  reset() {
    this.incomplete = Buffer.alloc(0)
  }
}

module.exports = BufferStitcher