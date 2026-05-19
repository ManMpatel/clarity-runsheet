const { MongoClient } = require('mongodb')

let db = null

async function connect() {
  if (db) return db

  const client = new MongoClient(process.env.MONGO_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  })

  await client.connect()
  db = client.db(process.env.MONGO_DB_NAME || 'clarity_fleet')
  console.log('[MongoDB] Connected')
  return db
}

async function getDb() {
  if (!db) await connect()
  return db
}

async function getCollection(name) {
  const database = await getDb()
  return database.collection(name)
}

module.exports = { connect, getDb, getCollection }
