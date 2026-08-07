import { pgEnum, pgTable, uuid, time, integer, timestamp } from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const fbtModeEnum = pgEnum('fbt_mode', ['auto', 'all_business', 'all_personal'])

export const fbtSettings = pgTable('fbt_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  // NEW unique constraint — upserted as a natural {companyId} key in Mongo with no DB-level
  // uniqueness guarantee. One settings row per company.
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  businessHoursStart: time('business_hours_start'),
  businessHoursEnd: time('business_hours_end'),
  businessDays: integer('business_days').array(),
  mode: fbtModeEnum('mode').notNull().default('auto'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
