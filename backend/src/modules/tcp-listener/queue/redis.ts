// @ts-nocheck
// This is the ONE place Redis survives in the whole backend: the hand-rolled
// LPUSH/BRPOP telemetry_queue handoff to the ingestion entrypoint. Preserved
// exactly as it was in tcp-listener/queue/redis.js.
//
// The old `setCurrentVanState` (van:state:{imei} cache write) has been
// REMOVED here — that was a Redis-dependent feature outside the telemetry
// handoff. Live vehicle state now lives in Postgres (`vehicle_state` table),
// upserted once by ingestion's enrichment processor after it dequeues each
// packet, instead of being written twice (once here, once by whoever read
// the cache). This is the one authorized logic change in tcp-listener,
// permitted because it eliminates a Redis dependency, not because the
// decoding/queueing logic itself changed.
const Redis = require('ioredis')

let client = null

function getClient() {
  if (client) return client

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 10) return null
      return Math.min(times * 200, 2000)
    }
  })

  client.on('connect', () => console.log('[Redis] Connected'))
  client.on('error', (err) => console.error('[Redis] Error:', err.message))

  return client
}

async function pushToQueue(parsedRecords, imei) {
  const redis = getClient()

  // Pipelined instead of one `await lpush` per record — a batch of N records
  // was N sequential round trips; this is one round trip regardless of N.
  const pipeline = redis.pipeline()
  for (const record of parsedRecords) {
    const payload = JSON.stringify({
      imei,
      ...record,
      receivedAt: Date.now()
    })
    pipeline.lpush('telemetry_queue', payload)
  }
  await pipeline.exec()
}

module.exports = { getClient, pushToQueue }
