// @ts-nocheck — CommonJS require/module.exports, matching the rest of the
// tcp-listener module (sockets.ts, redis.ts, commands.ts, etc). Without any
// import/export, TS treats a .ts file with no module markers as a global
// script rather than a module, which otherwise collides top-level names
// (e.g. getUsageSnapshot) across files at the global scope.
//
// Per-IMEI cellular usage counters — in-memory, process-local (same tradeoff as
// registry/sockets.ts: lost on restart, which is fine since this is a rolling
// diagnostic view, not a billing record; Phase 4 is what persists daily rollups).
//
// Exists to answer, with real numbers instead of guesses, how many bytes/records
// each device is actually sending and whether CRC failures make up a meaningful
// share of traffic (a device that never gets acked for a corrupt block may resend
// it, burning SIM data twice for the same data).

interface DeviceUsage {
  bytesReceived: number
  recordsReceived: number
  packetsReceived: number
  crcFailures: number
  reconnects: number
  firstSeen: number
  lastSeen: number
}

const usage = new Map<string, DeviceUsage>()

function getOrCreate(imei: string): DeviceUsage {
  let entry = usage.get(imei)
  if (!entry) {
    entry = {
      bytesReceived: 0,
      recordsReceived: 0,
      packetsReceived: 0,
      crcFailures: 0,
      reconnects: 0,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    }
    usage.set(imei, entry)
  }
  return entry
}

function recordBytes(imei: string, byteLength: number): void {
  const entry = getOrCreate(imei)
  entry.bytesReceived += byteLength
  entry.lastSeen = Date.now()
}

function recordPacket(imei: string, recordCount: number): void {
  const entry = getOrCreate(imei)
  entry.packetsReceived += 1
  entry.recordsReceived += recordCount
}

function recordCrcFailure(imei: string): void {
  getOrCreate(imei).crcFailures += 1
}

function recordReconnect(imei: string): void {
  getOrCreate(imei).reconnects += 1
}

function getUsageSnapshot(): Record<string, DeviceUsage> {
  return Object.fromEntries(usage)
}

module.exports = {
  recordBytes,
  recordPacket,
  recordCrcFailure,
  recordReconnect,
  getUsageSnapshot,
}
