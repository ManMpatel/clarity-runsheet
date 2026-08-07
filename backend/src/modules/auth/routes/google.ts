const express        = require('express')
const passport       = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const jwt            = require('jsonwebtoken')
const { getCollection } = require('../db/mongo')

const router = express.Router()

passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value.toLowerCase()
      const name  = profile.displayName

      const users     = await getCollection('users')
      const companies = await getCollection('companies')

      let user = await users.findOne({ email })

      if (!user) {
        const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        const existingCompany = await companies.findOne({ slug })
        const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

        const companyResult = await companies.insertOne({
          name,
          slug:             finalSlug,
          subscriptionTier: 'locked',
          slots: { entrySlots: 0, midSlots: 0, topSlots: 0 },
          active:    true,
          createdAt: new Date(),
        })

        const inserted = await users.insertOne({
          companyId:        companyResult.insertedId.toString(),
          name,
          email,
          passwordHash:     null,
          googleId:         profile.id,
          role:             'companyAdmin',
          subscriptionTier: 'locked',
          createdAt:        new Date(),
        })

        user = await users.findOne({ _id: inserted.insertedId })
      }

      return done(null, user)
    } catch (err) {
      return done(err, null)
    }
  }
))

router.get('/', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}))

router.get('/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=google' }),
  async (req, res) => {
    try {
      const user = req.user
      const companies = await getCollection('companies')
      const { ObjectId } = require('mongodb')
      const company = await companies.findOne({
        _id: ObjectId.createFromHexString(user.companyId.toString())
      })

      const token = jwt.sign(
        {
          userId:           user._id.toString(),
          companyId:        user.companyId.toString(),
          role:             user.role,
          subscriptionTier: user.subscriptionTier || 'entry',
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      )

      const onboarding = company?.onboardingComplete ? 'true' : 'false'
      const dashboard  = process.env.DASHBOARD_URL || 'http://localhost:5173'

      res.redirect(`${dashboard}/auth/google/success?token=${token}&onboarding=${onboarding}`)
    } catch (err) {
      console.error('[Google Auth] Callback error:', err.message)
      res.redirect('/login?error=server')
    }
  }
)

router.post('/mobile', async (req, res) => {
  try {
    const { idToken } = req.body
    if (!idToken) return res.status(400).json({ error: 'idToken required' })

    const axios = require('axios')
    const { data: payload } = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`
    )

    if (!payload.email) return res.status(401).json({ error: 'Invalid Google token' })

    const email = payload.email.toLowerCase()
    const name  = payload.name || email.split('@')[0]

    const users     = await getCollection('users')
    const companies = await getCollection('companies')
    const { ObjectId } = require('mongodb')

    let user = await users.findOne({ email })

    if (!user) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const existingCompany = await companies.findOne({ slug })
      const finalSlug = existingCompany ? `${slug}-${Date.now()}` : slug

      const companyResult = await companies.insertOne({
        name,
        slug:             finalSlug,
        subscriptionTier: 'locked',
        slots:            { entrySlots: 0, midSlots: 0, topSlots: 0 },
        active:           true,
        createdAt:        new Date(),
      })

      const inserted = await users.insertOne({
        companyId:        companyResult.insertedId.toString(),
        name,
        email,
        passwordHash:     null,
        googleId:         payload.sub,
        role:             'companyAdmin',
        subscriptionTier: 'locked',
        createdAt:        new Date(),
      })

      user = await users.findOne({ _id: inserted.insertedId })
    } else if (!user.googleId) {
      await users.updateOne({ _id: user._id }, { $set: { googleId: payload.sub } })
    }

    const company = await companies.findOne({
      _id: ObjectId.createFromHexString(user.companyId.toString())
    })

    const token = jwt.sign(
      {
        userId:           user._id.toString(),
        companyId:        user.companyId.toString(),
        role:             user.role,
        subscriptionTier: user.subscriptionTier || company?.subscriptionTier || 'locked',
        accountType:      company?.accountType  || 'contractor',
      },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }
    )

    return res.json({
      token,
      user: {
        _id:              user._id,
        name:             user.name,
        email:            user.email,
        role:             user.role,
        subscriptionTier: user.subscriptionTier || 'locked',
        companyId:        user.companyId,
      }
    })
  } catch (err) {
    console.error('[Google Mobile Auth] Error:', err.message)
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router