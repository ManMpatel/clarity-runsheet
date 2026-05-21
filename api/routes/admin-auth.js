const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const speakeasy = require('speakeasy')
const QRCode = require('qrcode')
const { getCollection } = require('../db/mongo')

const router = express.Router()

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const admins = await getCollection('super_admins')
    const admin = await admins.findOne({ email: email.toLowerCase() })
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!admin.totpSecret) {
      return res.status(403).json({ error: 'TOTP not configured for this account' })
    }

    const tempToken = jwt.sign(
      { adminId: admin._id.toString(), stage: 'password_ok' },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    )

    return res.json({ tempToken })
  } catch (err) {
    console.error('[AdminAuth] Login error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/verify-totp', async (req, res) => {
  try {
    const { tempToken, code } = req.body
    if (!tempToken || !code) {
      return res.status(400).json({ error: 'Token and code required' })
    }

    let decoded
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET)
    } catch (err) {
      return res.status(401).json({ error: 'Temp token invalid or expired' })
    }

    if (decoded.stage !== 'password_ok') {
      return res.status(401).json({ error: 'Invalid token stage' })
    }

    const admins = await getCollection('super_admins')
    const { ObjectId } = require('mongodb')
    const admin = await admins.findOne({ _id: new ObjectId(decoded.adminId) })
    if (!admin) {
      return res.status(401).json({ error: 'Admin not found' })
    }

    const valid = speakeasy.totp.verify({
      secret:   admin.totpSecret,
      encoding: 'base32',
      token:    code,
    })

    if (!valid) {
      return res.status(401).json({ error: 'Invalid authenticator code' })
    }

    const adminToken = jwt.sign(
      {
        adminId:       admin._id.toString(),
        role:          'superAdmin',
        totp_verified: true,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    )

    return res.json({ token: adminToken, admin: { email: admin.email } })
  } catch (err) {
    console.error('[AdminAuth] TOTP verify error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

router.post('/setup-totp', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const admins = await getCollection('super_admins')
    const admin = await admins.findOne({ email: email.toLowerCase() })
    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, admin.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (admin.totpSecret) {
      return res.status(409).json({ error: 'TOTP already configured' })
    }

    const secret = speakeasy.generateSecret({ name: 'Clarity Fleet Admin' })
    const otpAuthUrl = speakeasy.otpauthURL({
      secret:   secret.base32,
      label:    admin.email,
      issuer:   'Clarity Fleet Admin',
      encoding: 'base32',
    })

    const qrDataUrl = await QRCode.toDataURL(otpAuthUrl)

    await admins.updateOne(
      { _id: admin._id },
      { $set: { totpSecret: secret.base32, totpConfiguredAt: new Date() } }
    )

    return res.json({ qrDataUrl, secret: secret.base32 })
  } catch (err) {
    console.error('[AdminAuth] Setup TOTP error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router