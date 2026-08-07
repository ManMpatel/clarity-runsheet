import { pgTable, uuid, date, numeric, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { drivers } from './drivers'

export const safetyScores = pgTable('safety_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  driverId: uuid('driver_id').notNull().references(() => drivers.id),
  weekStart: date('week_start').notNull(),
  weekEnd: date('week_end').notNull(),
  brakingScore: numeric('braking_score'),
  accelScore: numeric('accel_score'),
  corneringScore: numeric('cornering_score'),
  speedingScore: numeric('speeding_score'),
  overallScore: numeric('overall_score'),
  eventCount: integer('event_count'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  driverWeekIdx: index('safety_scores_driver_week_idx').on(t.driverId, t.weekStart),
  companyWeekIdx: index('safety_scores_company_week_idx').on(t.companyId, t.weekStart),
}))
