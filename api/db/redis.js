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

  client.on('connect', () => console.log('[Redis] API connected'))
  client.on('error', (err) => console.error('[Redis] Error:', err.message))

  return client
}

module.exports = { getClient }