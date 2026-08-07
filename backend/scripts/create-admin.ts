const bcrypt = require('bcryptjs')
const { MongoClient } = require('mongodb')
require('dotenv').config({ path: './.env' })

async function createAdmin() {
  const client = new MongoClient(process.env.MONGO_URI)

  try {
    await client.connect()
    const db = client.db()
    const admins = db.collection('super_admins')

    const existing = await admins.findOne({ email: 'admin@claritysoftware.au' })
    if (existing) {
      console.log('Admin already exists — aborting')
      process.exit(0)
    }

    const passwordHash = await bcrypt.hash('Admin2026!', 12)

    await admins.insertOne({
      email:       'admin@claritysoftware.au',
      passwordHash,
      totpSecret:  null,
      createdAt:   new Date(),
    })

    console.log('Admin account created successfully')
    console.log('Email:    admin@claritysoftware.au')
    console.log('Password: Admin2026!')
    console.log('Next: call POST /admin/auth/setup-totp to configure Google Authenticator')
  } catch (err) {
    console.error('Error:', err.message)
  } finally {
    await client.close()
  }
}

createAdmin()
