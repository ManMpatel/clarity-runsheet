// Populates the demo company (created by create-demo-user.ts) with a realistic fleet so the
// redesigned dashboard has something to render — /dashboard/summary and Dashboard.jsx are close
// to meaningless against an empty database (no chart, no donut, no vehicle list, no attention
// panel), which is the actual state of this DB today.
//
// Deliberately exercises the edge cases the dashboard's states depend on:
//   - one vehicle with a vehicle_state row stale by 40 minutes -> the "offline" bucket
//   - one vehicle with NO vehicle_state row at all -> the "never reported" bucket
//   - trips with classification IS NULL -> the "unclassified" FBT count
//   - trips with end_time IS NULL -> "trips in progress"
//   - maintenance rows that are overdue / due soon / already completed
//   - an alert_rules row with a non-default speed_limit (100, not the 110 default), which is the
//     concrete way to confirm GET /dashboard/summary's thresholds.speedLimit actually reflects
//     the company's own setting rather than a hardcoded client-side constant.
import 'dotenv/config'
import { eq, sql } from 'drizzle-orm'
import { db, pool } from '../src/db/client'
import { companies, vehicles, vehicleState, drivers, trips, alerts, maintenance, alertRules } from '../src/db/schema'

const DEMO_SLUG = 'demo-company'

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function randFloat(min: number, max: number, decimals = 1) {
  return Number((Math.random() * (max - min) + min).toFixed(decimals))
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)]
}
function minutesAgo(mins: number) {
  return new Date(Date.now() - mins * 60 * 1000)
}
function daysAgo(days: number, hour = 9) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(hour, randInt(0, 59), 0, 0)
  return d
}
function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10)
}

const ADDRESSES = [
  '123 George St, Sydney NSW', '45 Smith St, Parramatta NSW', '8 Church Ave, Chatswood NSW',
  '210 King St, Newtown NSW', '17 Bridge Rd, Glebe NSW', '92 Pitt St, Sydney NSW',
  '3 Anzac Pde, Kensington NSW', '56 Victoria Rd, Ryde NSW', '140 Elizabeth St, Sydney NSW',
]

const VEHICLE_NAMES = [
  'Van 01', 'Van 02', 'Van 03', 'Van 04', 'Van 05', 'Van 06', 'Van 07', 'Van 08',
] as const
const TIERS = ['entry', 'entry', 'mid', 'mid', 'mid', 'top', 'top', 'top'] as const

const ALERT_TYPES = [
  'speeding', 'geofenceBreach', 'lowBattery', 'harshBraking', 'engineFault', 'afterHours',
] as const
const SEVERITIES = ['critical', 'warning', 'info'] as const

const DRIVER_NAMES = ['Alex Chen', 'Priya Patel', 'Jordan Nguyen', 'Sam Okafor']

const MAINTENANCE_TYPES = ['Service', 'Tyre rotation', 'Brake inspection']

async function seed() {
  const [company] = await db.select().from(companies).where(eq(companies.slug, DEMO_SLUG)).limit(1)
  if (!company) {
    console.error(`No company with slug "${DEMO_SLUG}" found. Run "npm run create-demo-user" first.`)
    process.exit(1)
  }

  const [{ count: existingVehicles }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(vehicles).where(eq(vehicles.companyId, company.id))
  if (existingVehicles > 0) {
    console.log(`Demo company already has ${existingVehicles} vehicle(s) — aborting to avoid duplicate seeding.`)
    process.exit(0)
  }

  // 1) Vehicles
  const vehicleRows = await db.insert(vehicles).values(
    VEHICLE_NAMES.map((name, i) => ({
      companyId: company.id,
      name,
      imei: `35688109${String(200 + i).padStart(6, '0')}`,
      registration: `AB${String(10 + i).padStart(2, '0')}CD`,
      make: pick(['Toyota', 'Ford', 'Isuzu', 'Hyundai']),
      model: pick(['HiAce', 'Transit', 'NPR', 'Staria']),
      year: randInt(2019, 2025),
      tier: TIERS[i],
      tierChangesRemaining: 2,
      active: true,
    }))
  ).returning()

  // 2) Vehicle state — 7 of 8 vehicles report; the 8th is left with no row at all ("never
  // reported"). Van 03 is stale by 40 minutes so it lands in the "offline" bucket even though a
  // row exists. The rest are fresh with a mix of the three live statuses.
  const today = toDateStr(new Date())
  const liveVehicles = vehicleRows.slice(0, 7)
  await db.insert(vehicleState).values(
    liveVehicles.map((v, i) => {
      const isStale = i === 2 // Van 03
      const status = isStale ? 'stopped' : (['moving', 'moving', 'idle', 'stopped', 'moving', 'idle'] as const)[i]
      const speed = status === 'moving' ? randInt(20, 95) : 0
      return {
        vehicleId: v.id,
        updatedAt: isStale ? minutesAgo(40) : minutesAgo(randInt(0, 8)),
        lat: -33.87 + randFloat(-0.08, 0.08, 4),
        lng: 151.21 + randFloat(-0.08, 0.08, 4),
        speed,
        ignition: status !== 'stopped',
        odometer: randInt(20000, 180000),
        status: status as 'moving' | 'idle' | 'stopped',
        stateChangedAt: minutesAgo(randInt(5, 240)),
        address: pick(ADDRESSES),
        todayKm: randFloat(0, 220, 1).toString(),
        todayOdometerBase: randInt(20000, 180000),
        todayDate: today,
      }
    })
  )
  // vehicleRows[7] ("Van 08") intentionally gets no vehicle_state row.

  // 3) Drivers, a few assigned to vehicles
  const driverRows = await db.insert(drivers).values(
    DRIVER_NAMES.map((name, i) => ({
      companyId: company.id,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
      mobile: `04${randInt(10000000, 99999999)}`,
      vehicleId: vehicleRows[i]?.id ?? null,
      active: true,
    }))
  ).returning()

  // 4) Trips — ~200 over the last 14 days. 3 are left "in progress" (endTime null), spread across
  // 3 different vehicles so the dashboard's "in progress" list isn't a single repeated vehicle.
  // Roughly 1 in 8 are left unclassified to populate the FBT "unclassified" count.
  const TOTAL_TRIPS = 200
  const inProgressIdx = new Set<number>()
  while (inProgressIdx.size < 3) inProgressIdx.add(randInt(0, TOTAL_TRIPS - 1))

  const tripRows = Array.from({ length: TOTAL_TRIPS }, (_, i) => {
    const vehicle = pick(vehicleRows)
    const driver = Math.random() < 0.6 ? pick(driverRows) : null
    const isInProgress = inProgressIdx.has(i)
    // In-progress trips must land today with no end time — pinning `day` to 0 here (rather than
    // only checking `day === 0` after an independent random roll) is what actually guarantees 3
    // such trips exist, instead of leaving it to a ~1-in-14 coincidence per candidate index.
    const day = isInProgress ? 0 : randInt(0, 13)
    const start = isInProgress ? minutesAgo(randInt(10, 90)) : daysAgo(day, randInt(6, 19))
    const durationMinutes = randInt(5, 120)
    const end = isInProgress ? null : new Date(start.getTime() + durationMinutes * 60 * 1000)
    // A trip that hasn't ended can't realistically be classified yet, on top of the ~1-in-8 rows
    // left unclassified regardless.
    const unclassified = isInProgress || i % 8 === 0

    return {
      imei: vehicle.imei,
      companyId: company.id,
      vehicleId: vehicle.id,
      driverId: driver?.id ?? null,
      startTime: start,
      endTime: end,
      startLat: -33.87 + randFloat(-0.1, 0.1, 4),
      startLng: 151.21 + randFloat(-0.1, 0.1, 4),
      endLat: end ? -33.87 + randFloat(-0.1, 0.1, 4) : null,
      endLng: end ? 151.21 + randFloat(-0.1, 0.1, 4) : null,
      distanceKm: randFloat(2, 80, 2).toString(),
      durationMinutes: end ? durationMinutes : null,
      maxSpeed: randInt(40, 130),
      classification: unclassified ? null : (Math.random() < 0.7 ? 'business' as const : 'personal' as const),
      purpose: unclassified ? null : pick(['Client visit', 'Delivery', 'Depot run', 'Commute']),
      classifiedAt: unclassified ? null : start,
      classifiedBy: unclassified ? null : 'auto',
    }
  })
  await db.insert(trips).values(tripRows)

  // 5) Alerts — ~30 over the last 7 days, every severity and 6 types represented, mostly unread
  // (recent ones) with a handful already read (older ones) so the bell/feed both have content.
  const TOTAL_ALERTS = 30
  const alertRows = Array.from({ length: TOTAL_ALERTS }, (_, i) => {
    const vehicle = pick(vehicleRows)
    const type = ALERT_TYPES[i % ALERT_TYPES.length]
    const severity = pick(SEVERITIES)
    const timestamp = daysAgo(randInt(0, 6), randInt(6, 21))
    const read = i % 3 === 0 // older third pre-read
    const messages: Record<(typeof ALERT_TYPES)[number], string> = {
      speeding: `${vehicle.name} exceeded the speed limit (${randInt(111, 135)} km/h)`,
      geofenceBreach: `${vehicle.name} left the "Depot" geofence`,
      lowBattery: `${vehicle.name} tracker battery below threshold`,
      harshBraking: `${vehicle.name} recorded a harsh braking event`,
      engineFault: `${vehicle.name} reported an engine fault code`,
      afterHours: `${vehicle.name} moved outside business hours`,
    }
    return {
      type,
      imei: vehicle.imei,
      companyId: company.id,
      vehicleId: vehicle.id,
      message: messages[type],
      severity,
      timestamp,
      lat: -33.87 + randFloat(-0.08, 0.08, 4),
      lng: 151.21 + randFloat(-0.08, 0.08, 4),
      read,
      readAt: read ? timestamp : null,
      createdAt: timestamp,
    }
  })
  await db.insert(alerts).values(alertRows)

  // 6) Maintenance — one overdue, one due soon, one already completed.
  const in3Days = new Date()
  in3Days.setDate(in3Days.getDate() + 3)
  const overdue = new Date()
  overdue.setDate(overdue.getDate() - 5)
  const completedOn = new Date()
  completedOn.setDate(completedOn.getDate() - 20)

  await db.insert(maintenance).values([
    {
      companyId: company.id, vehicleId: vehicleRows[0].id, type: pick(MAINTENANCE_TYPES),
      dueDate: toDateStr(overdue), status: 'pending', notes: 'Overdue — schedule ASAP',
    },
    {
      companyId: company.id, vehicleId: vehicleRows[1].id, type: pick(MAINTENANCE_TYPES),
      dueDate: toDateStr(in3Days), status: 'pending', notes: 'Booked with local garage',
    },
    {
      companyId: company.id, vehicleId: vehicleRows[2].id, type: pick(MAINTENANCE_TYPES),
      dueDate: toDateStr(completedOn), status: 'completed', completedDate: toDateStr(completedOn),
      completionNotes: 'Completed on schedule',
    },
  ])

  // 7) Alert rules — 100 km/h rather than the 110 default, so a working dashboard visibly reflects
  // this company's own threshold instead of a hardcoded client constant.
  await db.insert(alertRules).values({
    companyId: company.id, type: 'speeding', active: true, speedLimit: 100,
  })

  console.log(`Seeded ${vehicleRows.length} vehicles, ${tripRows.length} trips, ${alertRows.length} alerts, 3 maintenance records.`)
  console.log('Van 03 is offline (stale 40 min); Van 08 has never reported.')
}

seed()
  .catch(err => { console.error('Error:', err.message); process.exitCode = 1 })
  .finally(() => pool.end())
