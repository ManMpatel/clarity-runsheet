// Seeds a demo company + companyAdmin account for local testing of the post-auth app flow.
import bcrypt from 'bcryptjs'
import { eq } from 'drizzle-orm'
import 'dotenv/config'
import { db, pool } from '../src/db/client'
import { users, companies } from '../src/db/schema'

const DEMO_EMAIL = 'demo@demo.com'
const DEMO_PASSWORD = 'Demo@12345'

async function createDemoUser() {
  try {
    const [existing] = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1)

    if (existing) {
      console.log('Demo user already exists — aborting')
      process.exit(0)
    }

    const [company] = await db.insert(companies).values({
      name: 'Demo Company',
      slug: 'demo-company',
      subscriptionTier: 'top',
      entrySlots: 5,
      midSlots: 5,
      topSlots: 5,
      onboardingComplete: true,
      accountType: 'contractor',
    }).returning()

    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

    await db.insert(users).values({
      companyId: company.id,
      name: 'Demo User',
      email: DEMO_EMAIL,
      passwordHash,
      role: 'companyAdmin',
      subscriptionTier: 'top',
      emailVerified: true,
      driverConsentGiven: true,
      driverConsentGivenAt: new Date(),
    })

    console.log('Demo account created successfully')
    console.log('Email:    ' + DEMO_EMAIL)
    console.log('Password: ' + DEMO_PASSWORD)
  } catch (err: any) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

createDemoUser()
