// Ported from api/index.js. All routes now mount under /api/v1/* (were flat /api/*), every
// response goes through the {success,message,data,errors} envelope, and Postgres/Drizzle
// replaces the Mongo native driver + api/db/setup.js's ad-hoc index bootstrap (indexes now live
// in the Drizzle schema + migrations instead of being created imperatively at boot).
require('dotenv').config()
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from '../modules/auth/passport'
import { responseEnvelope, errorHandler } from '../middleware/response-envelope'
import { platform } from '../middleware/platform'
import { apiRateLimit } from '../middleware/rate-limit'

import authRoutes from '../modules/auth/routes/auth'
import adminAuthRoutes from '../modules/auth/routes/admin-auth'
import { webGoogleRouter, mobileGoogleRouter } from '../modules/auth/routes/google'
import billingRoutes from '../modules/billing/routes/billing'
import upgradeRoutes from '../modules/billing/routes/upgrade'
import vehicleRoutes from '../modules/fleet/routes/vehicles'
import telemetryRoutes from '../modules/fleet/routes/telemetry'
import tripRoutes from '../modules/fleet/routes/trips'
import driverRoutes from '../modules/fleet/routes/drivers'
import geofenceRoutes from '../modules/fleet/routes/geofences'
import maintenanceRoutes from '../modules/fleet/routes/maintenance'
import fbtRoutes from '../modules/fleet/routes/fbt'
import imeiRoutes from '../modules/fleet/routes/imei'
import adminRoutes from '../modules/admin/routes/admin'
import reportsRoutes from '../modules/admin/routes/reports'
import settingsRoutes from '../modules/admin/routes/settings'
import supportRoutes from '../modules/admin/routes/support'
import referralRoutes from '../modules/admin/routes/referrals'
import alertRoutes from '../modules/fleet/routes/alerts'
import registerDeviceRoute from '../modules/notifications/routes/register-device'
import reportsAsyncRoutes from '../modules/fleet/routes/reports-async'

const app = express()
const PORT = process.env.PORT || 3000

// CORS scoped to the web origin only — mobile requests aren't subject to CORS at all, that's a
// browser-only mechanism. `credentials: true` is required for the httpOnly refresh cookie to be
// sent/received cross-origin from the dashboard's dev server.
app.use(cors({ origin: process.env.WEB_URL || process.env.DASHBOARD_URL || 'http://localhost:5173', credentials: true }))
app.use(cookieParser())

// Stripe's webhook needs the raw body for signature verification — must be registered before
// express.json() touches the request. Same ordering constraint as the original.
app.use((req, res, next) => {
  if (req.originalUrl === '/api/v1/billing/webhook') return next()
  express.json()(req, res, next)
})

app.use(responseEnvelope)
app.use(platform)
app.use(passport.initialize())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Web Google OAuth stays outside /api/v1 — it's a browser redirect flow, not a JSON API call.
app.use('/auth/google', webGoogleRouter)

const v1 = express.Router()
v1.use(apiRateLimit)

v1.use('/auth', authRoutes)
v1.use('/auth/google', mobileGoogleRouter)
v1.use('/admin/auth', adminAuthRoutes)
v1.use('/vehicles', vehicleRoutes)
v1.use('/telemetry', telemetryRoutes)
v1.use('/trips', tripRoutes)
v1.use('/drivers', driverRoutes)
v1.use('/alerts', alertRoutes)
v1.use('/geofences', geofenceRoutes)
v1.use('/maintenance', maintenanceRoutes)
v1.use('/reports', reportsRoutes)
v1.use('/reports', reportsAsyncRoutes) // POST /reports + GET /reports/:id polling (Phase 4 async reports)
v1.use('/fbt', fbtRoutes)
v1.use('/settings', settingsRoutes)
v1.use('/admin', adminRoutes)
v1.use('/upgrade', upgradeRoutes)
v1.use('/support', supportRoutes)
v1.use('/imei', imeiRoutes)
v1.use('/referrals', referralRoutes)
v1.use('/billing', billingRoutes)
v1.use('/notifications', registerDeviceRoute)

app.use('/api/v1', v1)

// Mounted last — catches everything thrown/next(err)'d anywhere above. No HTML error pages, no
// redirects, ever, under /api/v1/*.
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[API] Running on port ${PORT}`)
})
