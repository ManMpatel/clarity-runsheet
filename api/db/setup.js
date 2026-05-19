const { getDb } = require('./mongo')

async function setupDatabase() {
  const db = await getDb()
  await createTelemetryCollection(db)
  await createIndexes(db)
  console.log('[Setup] Database ready')
}

async function createTelemetryCollection(db) {
  const collections = await db
    .listCollections({ name: 'telemetry_events' })
    .toArray()

  if (collections.length > 0) {
    console.log('[Setup] telemetry_events already exists — skipping')
    return
  }

  await db.createCollection('telemetry_events', {
    timeseries: {
      timeField:   'timestamp',
      metaField:   'metadata',
      granularity: 'seconds',
    },
    expireAfterSeconds: 60 * 60 * 24 * 365,
  })

  console.log('[Setup] telemetry_events time series collection created')
}

async function createIndexes(db) {
  const telemetry = db.collection('telemetry_events')
  await telemetry.createIndex(
    { 'metadata.companyId': 1, timestamp: -1 },
    { name: 'company_timestamp' }
  )
  await telemetry.createIndex(
    { 'metadata.vehicleId': 1, timestamp: -1 },
    { name: 'vehicle_timestamp' }
  )

  const vehicles = db.collection('vehicles')
  await vehicles.createIndex({ companyId: 1 })
  await vehicles.createIndex({ imei: 1 }, { unique: true })

  const alerts = db.collection('alerts')
  await alerts.createIndex({ companyId: 1, createdAt: -1 })
  await alerts.createIndex({ companyId: 1, read: 1 })

  const geofences = db.collection('geofences')
  await geofences.createIndex({ companyId: 1 })

  const drivers = db.collection('drivers')
  await drivers.createIndex({ companyId: 1 })

  const maintenance = db.collection('maintenance')
  await maintenance.createIndex({ companyId: 1, vehicleId: 1 })

  const companies = db.collection('companies')
  await companies.createIndex({ slug: 1 }, { unique: true })

  const users = db.collection('users')
  await users.createIndex({ email: 1 }, { unique: true })
  await users.createIndex({ companyId: 1 })

  console.log('[Setup] All indexes created')
}

module.exports = { setupDatabase }
