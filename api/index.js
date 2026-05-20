require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { connect } = require('./db/mongo')
const { setupDatabase } = require('./db/setup')
const { rateLimiter } = require('./middleware/rateLimiter')
const upgradeRoutes = require('./routes/upgrade')

const authRoutes        = require('./routes/auth')
const vehicleRoutes     = require('./routes/vehicles')
const telemetryRoutes   = require('./routes/telemetry')
const tripRoutes        = require('./routes/trips')
const driverRoutes      = require('./routes/drivers')
const alertRoutes       = require('./routes/alerts')
const geofenceRoutes    = require('./routes/geofences')
const maintenanceRoutes = require('./routes/maintenance')
const reportsRoutes     = require('./routes/reports')
const fbtRoutes         = require('./routes/fbt')
const settingsRoutes    = require('./routes/settings')
const adminRoutes       = require('./routes/admin')

const app  = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.DASHBOARD_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(rateLimiter)

app.use('/api/auth',        authRoutes)
app.use('/api/vehicles',    vehicleRoutes)
app.use('/api/telemetry',   telemetryRoutes)
app.use('/api/trips',       tripRoutes)
app.use('/api/drivers',     driverRoutes)
app.use('/api/alerts',      alertRoutes)
app.use('/api/geofences',   geofenceRoutes)
app.use('/api/maintenance', maintenanceRoutes)
app.use('/api/reports',     reportsRoutes)
app.use('/api/fbt',         fbtRoutes)
app.use('/api/settings',    settingsRoutes)
app.use('/api/admin',       adminRoutes)
app.use('/api/upgrade', upgradeRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

async function start() {
  await connect()
  await setupDatabase()
  app.listen(PORT, () => {
    console.log(`[API] Running on port ${PORT}`)
  })
}

start().catch(err => {
  console.error('[API] Fatal error:', err.message)
  process.exit(1)
})