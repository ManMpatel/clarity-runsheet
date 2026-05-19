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

  client.on('connect', () => console.log('[Redis] Worker connected'))
  client.on('error', (err) => console.error('[Redis] Error:', err.message))

  return client
}

async function getVanState(imei) {
  const redis = getClient()
  const raw = await redis.get(`van:state:${imei}`)
  return raw ? JSON.parse(raw) : null
}

async function setVanState(imei, state) {
  const redis = getClient()
  await redis.set(`van:state:${imei}`, JSON.stringify(state))
  await redis.expire(`van:state:${imei}`, 86400)
}

async function setAlertCooldown(key, ttlSeconds) {
  const redis = getClient()
  await redis.set(`alert:cooldown:${key}`, '1', 'EX', ttlSeconds)
}

async function checkAlertCooldown(key) {
  const redis = getClient()
  const val = await redis.get(`alert:cooldown:${key}`)
  return val !== null
}

async function setGeofenceState(imei, zoneId, state) {
  const redis = getClient()
  await redis.set(`geo:state:${imei}:${zoneId}`, state)
}

async function getGeofenceState(imei, zoneId) {
  const redis = getClient()
  return await redis.get(`geo:state:${imei}:${zoneId}`)
}

module.exports = {
  getClient,
  getVanState,
  setVanState,
  setAlertCooldown,
  checkAlertCooldown,
  setGeofenceState,
  getGeofenceState,
}