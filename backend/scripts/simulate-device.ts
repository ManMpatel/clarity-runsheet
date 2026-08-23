// @ts-nocheck — matches the CommonJS style of the tcp-listener parser modules this imports.
//
// Fake FTC921. Speaks the real Teltonika wire protocol at the tcp-listener so the ENTIRE pipeline
// — listener -> Redis telemetry_queue -> ingestion -> telemetry/vehicle_state -> socket.io -> map
// — can be proven end-to-end without touching the physical device.
//
// This exists because configuring the real device costs an on-site visit in Australia. Every
// failure this script can surface (unprovisioned IMEI, blocked port, dead ingestion, wrong company
// on the socket room) is a failure you do NOT want to be diagnosing while a technician stands next
// to a van waiting.
//
// Usage:
//   npm run simulate-device -- --imei 865124073607428
//   npm run simulate-device -- --host tcp.clarity-software.com.au --imei 865124073607428 --count 20
//
// Flags: --host (default 127.0.0.1) --port (5027) --imei --count (10) --interval (2000 ms)
//        --lat --lng (start point, defaults to central Sydney) --dry-run (encode + self-test only)

const net = require('net')
const { crc16 } = require('../src/modules/tcp-listener/parser/crc16')
const { parseCodec8 } = require('../src/modules/tcp-listener/parser/codec8')

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  if (i !== -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')) return process.argv[i + 1]
  return fallback
}
const hasFlag = (name) => process.argv.includes(`--${name}`)

const HOST = arg('host', '127.0.0.1')
const PORT = parseInt(arg('port', '5027'), 10)
const IMEI = arg('imei', '865124073607428')
const COUNT = parseInt(arg('count', '10'), 10)
const INTERVAL = parseInt(arg('interval', '2000'), 10)
const DRY_RUN = hasFlag('dry-run')

let lat = parseFloat(arg('lat', '-33.8688'))
let lng = parseFloat(arg('lng', '151.2093'))

// ---------------------------------------------------------------------------
// Encoders — the exact inverse of parser/codec8.ts. Field order and widths are
// mirrored from parseAvlRecord()/parseIoElements() there; if that parser changes,
// this must change with it (the self-test below is what catches the drift).
// ---------------------------------------------------------------------------

function encodeIoElements({ oneByte = {}, twoByte = {}, fourByte = {}, eightByte = {} }) {
  const groups = [
    [1, oneByte],
    [2, twoByte],
    [4, fourByte],
    [8, eightByte],
  ]
  const total = groups.reduce((n, [, map]) => n + Object.keys(map).length, 0)

  const chunks = [Buffer.from([0x00]), Buffer.from([total])] // eventIoId=0 (periodic), total count

  for (const [size, map] of groups) {
    const ids = Object.keys(map)
    chunks.push(Buffer.from([ids.length]))
    for (const id of ids) {
      const buf = Buffer.alloc(1 + size)
      buf.writeUInt8(Number(id), 0)
      if (size === 1) buf.writeUInt8(map[id], 1)
      else if (size === 2) buf.writeUInt16BE(map[id], 1)
      else if (size === 4) buf.writeUInt32BE(map[id], 1)
      else buf.writeBigUInt64BE(BigInt(map[id]), 1)
      chunks.push(buf)
    }
  }

  return Buffer.concat(chunks)
}

function encodeAvlRecord({ timestamp, priority, longitude, latitude, altitude, angle, satellites, speed, io }) {
  const head = Buffer.alloc(8 + 1 + 4 + 4 + 2 + 2 + 1 + 2)
  let o = 0
  head.writeBigUInt64BE(BigInt(timestamp), o); o += 8
  head.writeUInt8(priority, o); o += 1
  head.writeInt32BE(Math.round(longitude * 1e7), o); o += 4
  head.writeInt32BE(Math.round(latitude * 1e7), o); o += 4
  head.writeInt16BE(altitude, o); o += 2
  head.writeUInt16BE(angle, o); o += 2
  head.writeUInt8(satellites, o); o += 1
  head.writeUInt16BE(speed, o)

  return Buffer.concat([head, encodeIoElements(io)])
}

function encodeCodec8(records) {
  const encoded = records.map(encodeAvlRecord)

  // "Data field" = codecId .. trailing record count. This is what BOTH dataFieldLength and the
  // CRC cover — verifyCRC() slices packet[8 .. 8+dataFieldLength] and CRCs exactly that.
  const inner = Buffer.concat([
    Buffer.from([0x08]),            // Codec ID
    Buffer.from([records.length]),  // Number of records
    ...encoded,
    Buffer.from([records.length]),  // Number of records (repeated)
  ])

  const packet = Buffer.alloc(4 + 4 + inner.length + 4)
  packet.writeUInt32BE(0x00000000, 0)      // Preamble
  packet.writeUInt32BE(inner.length, 4)    // Data field length
  inner.copy(packet, 8)
  packet.writeUInt32BE(crc16(inner), 8 + inner.length)

  return packet
}

// Login packet: 2-byte big-endian length prefix + ASCII IMEI. Mirrors parseImei() in
// entrypoints/tcp-listener.ts.
function encodeLogin(imei) {
  const body = Buffer.from(imei, 'ascii')
  const packet = Buffer.alloc(2 + body.length)
  packet.writeUInt16BE(body.length, 0)
  body.copy(packet, 2)
  return packet
}

// ---------------------------------------------------------------------------

function buildRecord() {
  // Drift ~11 m per step so the marker visibly moves and trip/geofence logic sees real motion.
  lat += 0.0001
  lng += 0.0001

  return {
    timestamp: Date.now(),
    priority: 1,
    longitude: lng,
    latitude: lat,
    altitude: 25,
    angle: 45,
    satellites: 12,
    speed: 60,
    io: {
      // IDs from parser/avl-ids.ts; widths chosen to match what normaliseRecord() reads
      // in ingestion/processors/telemetry.ts.
      oneByte:  { 21: 4, 71: 1, 240: 1 },        // gsmSignal, ignition ON, movementSensor
      twoByte:  { 66: 12500, 67: 4100 },         // externalVoltage 12.5 V, batteryVoltage 4.1 V (mV)
      fourByte: { 16: 1234567 },                 // totalOdometer, metres
    },
  }
}

// Encode, then decode with the REAL parser and compare. Catches an encoder that drifts from
// parser/codec8.ts before it can look like a network or provisioning fault.
function selfTest() {
  const record = buildRecord()
  const packet = encodeCodec8([record])

  const { verifyCRC } = require('../src/modules/tcp-listener/parser/crc16')
  if (!verifyCRC(packet)) throw new Error('self-test: CRC does not verify against crc16.verifyCRC()')

  const [decoded] = parseCodec8(packet)
  const checks = [
    ['latitude',  Math.round(record.latitude * 1e7),  Math.round(decoded.latitude * 1e7)],
    ['longitude', Math.round(record.longitude * 1e7), Math.round(decoded.longitude * 1e7)],
    ['speed',     record.speed,     decoded.speed],
    ['angle',     record.angle,     decoded.angle],
    ['altitude',  record.altitude,  decoded.altitude],
    ['satellites', record.satellites, decoded.satellites],
    ['ignition',  1, decoded.io.ignition],
    ['externalVoltage', 12500, decoded.io.externalVoltage],
    ['totalOdometer',   1234567, decoded.io.totalOdometer],
  ]
  for (const [field, want, got] of checks) {
    if (want !== got) throw new Error(`self-test: ${field} round-trip mismatch — encoded ${want}, parser read ${got}`)
  }

  console.log(`[sim] self-test passed — ${packet.length}-byte packet round-trips through parseCodec8()`)
  return packet
}

function main() {
  selfTest()

  if (DRY_RUN) {
    console.log('[sim] --dry-run: encoder verified, nothing sent.')
    return
  }

  console.log(`[sim] connecting to ${HOST}:${PORT} as IMEI ${IMEI}`)

  const socket = net.createConnection({ host: HOST, port: PORT }, () => {
    console.log('[sim] TCP connected — sending login packet')
    socket.write(encodeLogin(IMEI))
  })

  let loggedIn = false
  let sent = 0

  socket.on('data', (chunk) => {
    if (!loggedIn) {
      // Listener replies with a single 0x01 byte to accept the IMEI (0x00 = reject).
      if (chunk.length >= 1 && chunk[0] === 0x01) {
        loggedIn = true
        console.log('[sim] login ACCEPTED by listener')
        sendNext()
      } else {
        console.error(`[sim] login REJECTED (got 0x${chunk.toString('hex')}) — closing`)
        socket.end()
      }
      return
    }

    // Data ACK is a 4-byte big-endian count of records the listener accepted.
    if (chunk.length >= 4) {
      const acked = chunk.readUInt32BE(0)
      console.log(`[sim] server ACKed ${acked} record(s)  [${sent}/${COUNT} sent]`)
      // NOTE: this ACK means the LISTENER parsed and queued it. It does NOT mean ingestion
      // stored it — an IMEI with no vehicles row is ACKed here and dropped downstream. Check
      // the ingestion /health `unknownImei` counter to tell the two apart.
    }

    if (sent >= COUNT) {
      console.log('[sim] done — closing')
      socket.end()
      return
    }
    setTimeout(sendNext, INTERVAL)
  })

  function sendNext() {
    sent += 1
    const packet = encodeCodec8([buildRecord()])
    socket.write(packet)
    console.log(`[sim] sent record ${sent} @ ${lat.toFixed(5)}, ${lng.toFixed(5)} (${packet.length} bytes)`)
  }

  socket.on('error', (err) => {
    console.error(`[sim] socket error: ${err.message}`)
    if (err.code === 'ECONNREFUSED') {
      console.error('[sim] nothing is listening — is the tcp-listener up, and is 5027 open in the firewall?')
    }
    if (err.code === 'ETIMEDOUT') {
      console.error('[sim] connection timed out — port 5027 is likely blocked upstream of the host.')
    }
    process.exitCode = 1
  })

  socket.on('close', () => console.log('[sim] connection closed'))
}

main()
