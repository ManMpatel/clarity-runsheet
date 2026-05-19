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

  for (const record of parsedRecords) {
    const payload = JSON.stringify({
      imei,
      ...record,
      receivedAt: Date.now()
    })
    await redis.lpush('telemetry_queue', payload)
  }
}

async function setCurrentVanState(imei, companyId, record) {
  const redis = getClient()

  const state = JSON.stringify({
    imei,
    companyId,
    latitude:   record.latitude,
    longitude:  record.longitude,
    speed:      record.speed,
    angle:      record.angle,
    altitude:   record.altitude,
    satellites: record.satellites,
    timestamp:  record.timestamp,
    ignition:   record.io?.ignition ?? null,
    updatedAt:  Date.now()
  })

  await redis.set(`van:state:${imei}`, state)
  await redis.expire(`van:state:${imei}`, 86400)
}

module.exports = { getClient, pushToQueue, setCurrentVanState }
