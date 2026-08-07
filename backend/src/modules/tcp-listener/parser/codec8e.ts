// @ts-nocheck — relocated verbatim from tcp-listener/parser/codec8e.js, zero logic diff.
const { resolveId } = require('./avl-ids')

function parseCodec8E(buffer) {
  let offset = 0

  const preamble = buffer.readUInt32BE(offset)
  if (preamble !== 0x00000000) throw new Error('Invalid preamble')
  offset += 4

  const dataFieldLength = buffer.readUInt32BE(offset)
  offset += 4

  const codecId = buffer.readUInt8(offset)
  if (codecId !== 0x8E) throw new Error(`Expected Codec8E got ${codecId}`)
  offset += 1

  const recordCount = buffer.readUInt8(offset)
  offset += 1

  const records = []

  for (let i = 0; i < recordCount; i++) {
    const record = parseAvlRecordE(buffer, offset)
    records.push(record.data)
    offset = record.nextOffset
  }

  const trailingCount = buffer.readUInt8(offset)
  if (trailingCount !== recordCount) {
    throw new Error(`Codec8E record count mismatch: expected ${recordCount} got ${trailingCount}`)
  }

  return records
}

function parseAvlRecordE(buffer, offset) {
  const timestamp = buffer.readBigUInt64BE(offset)
  offset += 8

  const priority = buffer.readUInt8(offset)
  offset += 1

  const longitude = buffer.readInt32BE(offset) / 10000000
  offset += 4

  const latitude = buffer.readInt32BE(offset) / 10000000
  offset += 4

  const altitude = buffer.readInt16BE(offset)
  offset += 2

  const angle = buffer.readUInt16BE(offset)
  offset += 2

  const satellites = buffer.readUInt8(offset)
  offset += 1

  const speed = buffer.readUInt16BE(offset)
  offset += 2

  const ioData = parseIoElementsE(buffer, offset)
  offset = ioData.nextOffset

  return {
    nextOffset: offset,
    data: {
      timestamp: Number(timestamp),
      priority,
      longitude,
      latitude,
      altitude,
      angle,
      satellites,
      speed,
      io: ioData.elements,
    }
  }
}

function parseIoElementsE(buffer, offset) {
  const elements = {}

  const eventIoId = buffer.readUInt16BE(offset)
  offset += 2

  const totalCount = buffer.readUInt16BE(offset)
  offset += 2

  const sizes = [1, 2, 4, 8]

  for (const size of sizes) {
    const count = buffer.readUInt16BE(offset)
    offset += 2

    for (let i = 0; i < count; i++) {
      const id = buffer.readUInt16BE(offset)
      offset += 2

      let value
      if (size === 1)      value = buffer.readUInt8(offset)
      else if (size === 2) value = buffer.readUInt16BE(offset)
      else if (size === 4) value = buffer.readUInt32BE(offset)
      else if (size === 8) value = Number(buffer.readBigUInt64BE(offset))
      offset += size

      elements[resolveId(id)] = value
    }
  }

  const xCount = buffer.readUInt16BE(offset)
  offset += 2
  for (let i = 0; i < xCount; i++) {
    const id = buffer.readUInt16BE(offset)
    offset += 2
    const len = buffer.readUInt16BE(offset)
    offset += 2
    const value = buffer.slice(offset, offset + len).toString('hex')
    offset += len
    elements[resolveId(id)] = value
  }

  return { elements, nextOffset: offset, eventIoId, totalCount }
}

module.exports = { parseCodec8E }
