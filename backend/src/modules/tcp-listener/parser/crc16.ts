// @ts-nocheck — relocated verbatim from tcp-listener/parser/crc16.js, zero logic diff.
function crc16(buffer) {
  let crc = 0x0000

  for (let i = 0; i < buffer.length; i++) {
    crc ^= buffer[i]
    for (let j = 0; j < 8; j++) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001
      } else {
        crc = crc >> 1
      }
    }
  }

  return crc
}

function verifyCRC(packet) {
  if (packet.length < 12) return false

  const dataFieldLength = packet.readUInt32BE(4)
  const dataStart = 8
  const dataEnd = dataStart + dataFieldLength

  if (packet.length < dataEnd + 4) return false

  const dataToCheck = packet.slice(dataStart, dataEnd)
  const expectedCRC = packet.readUInt32BE(dataEnd)
  const calculatedCRC = crc16(dataToCheck)

  return calculatedCRC === expectedCRC
}

module.exports = { crc16, verifyCRC }