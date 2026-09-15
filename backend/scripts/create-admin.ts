// Ported from api/scripts/create-admin.js. Seeds the first super-admin account. Targets the
// merged `users` table (role='superAdmin') instead of a separate super_admins collection — see
// the schema comment in db/schema/users.ts for why that merge happened.
//
// Credentials come from the environment, NOT from constants in this file. They used to be
// hardcoded as admin@claritysoftware.au / Admin2026! — a working superadmin login for every
// deployment of this repo, published in git history, on a domain that isn't even ours
// (claritysoftware.au vs clarity-software.com.au). Anyone who read the repo owned the platform.
//
// SUPERADMIN_EMAIL is separate from ADMIN_EMAIL, which notifications/email.ts already uses as the
// *recipient* of admin alerts. They are often the same address, so ADMIN_EMAIL is accepted as a
// fallback — but the login identity gets its own name rather than silently overloading that one.
//
// Usage on the VPS:
//   SUPERADMIN_EMAIL=you@clarity-software.com.au SUPERADMIN_PASSWORD='<from a password manager>' \
//     docker compose -f docker-compose.yml -f docker-compose.prod.yml exec api npm run create-admin
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import 'dotenv/config'
import { db, pool } from '../src/db/client'
import { users } from '../src/db/schema'

const ADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD

async function createAdmin() {
  // Exit non-zero rather than falling back to a default. A silent default here is the whole bug
  // this script used to have.
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('SUPERADMIN_EMAIL (or ADMIN_EMAIL) and SUPERADMIN_PASSWORD must both be set.')
    console.error("Generate a password with: openssl rand -base64 24")
    await pool.end()
    process.exit(1)
  }
  // This account is the single most privileged credential on the platform — it bypasses company
  // scoping entirely. A short password is not worth the convenience.
  if (ADMIN_PASSWORD.length < 12) {
    console.error('SUPERADMIN_PASSWORD must be at least 12 characters.')
    await pool.end()
    process.exit(1)
  }

  try {
    const [existing] = await db.select().from(users)
      .where(and(eq(users.email, ADMIN_EMAIL), eq(users.role, 'superAdmin'))).limit(1)

    if (existing) {
      console.log('Admin already exists — aborting')
      process.exit(0)
    }

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

    await db.insert(users).values({
      email: ADMIN_EMAIL,
      name: 'Super Admin',
      passwordHash,
      role: 'superAdmin',
      companyId: null,
      emailVerified: true,
    })

    console.log('Admin account created successfully')
    console.log('Email: ' + ADMIN_EMAIL)
    console.log('Password: (the SUPERADMIN_PASSWORD you supplied — not echoed)')
    console.log('Next: call POST /api/v1/admin/auth/setup-totp to configure Google Authenticator')
  } catch (err: any) {
    console.error('Error:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

createAdmin()
