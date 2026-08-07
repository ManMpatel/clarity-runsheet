// Ported from api/scripts/create-admin.js. Seeds the first super-admin account. Targets the
// merged `users` table (role='superAdmin') instead of a separate super_admins collection — see
// the schema comment in db/schema/users.ts for why that merge happened.
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import 'dotenv/config'
import { db, pool } from '../src/db/client'
import { users } from '../src/db/schema'

const ADMIN_EMAIL = 'admin@claritysoftware.au'

async function createAdmin() {
  try {
    const [existing] = await db.select().from(users)
      .where(and(eq(users.email, ADMIN_EMAIL), eq(users.role, 'superAdmin'))).limit(1)

    if (existing) {
      console.log('Admin already exists — aborting')
      process.exit(0)
    }

    const passwordHash = await bcrypt.hash('Admin2026!', 12)

    await db.insert(users).values({
      email: ADMIN_EMAIL,
      name: 'Super Admin',
      passwordHash,
      role: 'superAdmin',
      companyId: null,
      emailVerified: true,
    })

    console.log('Admin account created successfully')
    console.log('Email:    ' + ADMIN_EMAIL)
    console.log('Password: Admin2026!')
    console.log('Next: call POST /api/v1/admin/auth/setup-totp to configure Google Authenticator')
  } catch (err: any) {
    console.error('Error:', err.message)
  } finally {
    await pool.end()
  }
}

createAdmin()
