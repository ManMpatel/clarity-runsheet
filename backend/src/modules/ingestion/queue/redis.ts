// The BRPOP consumer half of the telemetry_queue handoff — mirrors tcp-listener's LPUSH
// producer client shape (backend/src/modules/tcp-listener/queue/redis.ts). This is the other
// of the two places Redis survives in the whole backend.
const Redis = require('ioredis')

let client: any = null

function getClient() {
  if (client) return client

  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      if (times > 10) return null
      return Math.min(times * 200, 2000)
    },
  })

  client.on('connect', () => console.log('[Redis] Ingestion connected'))
  client.on('error', (err: Error) => console.error('[Redis] Error:', err.message))

  return client
}

module.exports = { getClient }
