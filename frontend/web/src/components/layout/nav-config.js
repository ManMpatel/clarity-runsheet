import {
  LayoutDashboard, Map, Route, Users, Bell, Shapes, Gauge, HeartPulse,
  FileBarChart, BookOpen, Wrench, CreditCard, Settings, ShieldCheck,
  ScanLine, Zap, Smartphone, Wallet,
} from 'lucide-react'

/**
 * Single source of truth for navigation. Previously the same links were typed out in Sidebar,
 * MobileBottomNav and SettingsLayout with three different visual languages and two different icon
 * systems (Heroicons v1 aliases in one, emoji in the others).
 *
 * Consumed by: Sidebar, MobileNavDrawer, MobileBottomNav (items with `mobile: true`),
 * CommandPalette, and usePageMeta (route -> title).
 *
 * Item fields:
 *   to, label, icon      required
 *   tier                 'mid' | 'top' — minimum plan; below it the item renders locked
 *   badge                'alerts' — renders the unread count
 *   mobile               include in the 5-slot bottom nav
 *   when(auth)           extra visibility predicate
 */
export const NAV_SECTIONS = [
  {
    id: 'overview',
    label: null,
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, mobile: true },
      { to: '/live-map',  label: 'Live Map',  icon: Map,             mobile: true },
    ],
  },
  {
    id: 'operations',
    label: 'Operations',
    items: [
      { to: '/trips',     label: 'Trips & History', icon: Route, mobile: true },
      { to: '/drivers',   label: 'Drivers',         icon: Users },
      { to: '/alerts',    label: 'Alerts',          icon: Bell, badge: 'alerts', mobile: true },
      { to: '/geofences', label: 'Geofences',       icon: Shapes, tier: 'mid' },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    items: [
      { to: '/driver-behaviour', label: 'Driver Behaviour', icon: Gauge,        tier: 'mid' },
      { to: '/fbt',              label: 'FBT Logbook',      icon: BookOpen,     tier: 'mid' },
      { to: '/vehicle-health',   label: 'Vehicle Health',   icon: HeartPulse,   tier: 'top' },
      { to: '/reports',          label: 'Reports',          icon: FileBarChart, tier: 'top' },
    ],
  },
  {
    id: 'manage',
    label: 'Manage',
    items: [
      { to: '/maintenance', label: 'Maintenance', icon: Wrench, tier: 'mid' },
      { to: '/billing',     label: 'Billing',     icon: CreditCard },
    ],
  },
  {
    id: 'garage',
    label: 'Garage tools',
    when: auth => auth.accountType === 'garage_owner',
    items: [
      { to: '/garage/imei-check',      label: 'IMEI Pre-Check',  icon: ScanLine },
      { to: '/garage/register-device', label: 'Register Device', icon: Zap },
      { to: '/garage/my-devices',      label: 'My Devices',      icon: Smartphone },
      { to: '/garage/earnings',        label: 'My Earnings',     icon: Wallet },
    ],
  },
]

export const FOOTER_ITEMS = [
  { to: '/settings', label: 'Settings', icon: Settings, mobile: true },
  {
    to: '/admin',
    label: 'Admin Panel',
    icon: ShieldCheck,
    adminBadge: true,
    when: auth => auth.role === 'superAdmin',
  },
]

const TIER_LEVELS = { locked: 0, entry: 1, mid: 2, top: 3 }

/** Mirrors the backend's requireTier ranking so the sidebar and the API agree on what's locked. */
export function hasTier(subscriptionTier, required) {
  if (!required) return true
  return (TIER_LEVELS[subscriptionTier] ?? 0) >= (TIER_LEVELS[required] ?? 0)
}

export function sectionsFor(auth) {
  // The old Sidebar branched on `auth.role === 'garageOwner'` for a reduced, garage-only rail.
  // That compares the JWT's user role (companyAdmin/fleetManager/user/superAdmin — see
  // authStore.login) against a value it can never hold; backend/src/db/schema/companies.ts's
  // `role` field comment confirms this was always dead and that `accountType === 'garage_owner'`
  // is what actually drives garage UI. In practice every account has always seen the full nav
  // below, with the 'garage' section's own `when` clause appending garage tools when relevant —
  // so that's the real, already-shipped behaviour, not a fallback.
  return NAV_SECTIONS.filter(s => !s.when || s.when(auth))
}

export function footerItemsFor(auth) {
  return FOOTER_ITEMS.filter(i => !i.when || i.when(auth))
}

/** Flat list of every visible item — used by the command palette and the page-title lookup. */
export function allItemsFor(auth) {
  return [...sectionsFor(auth).flatMap(s => s.items), ...footerItemsFor(auth)]
}

const EXTRA_TITLES = {
  '/onboarding': 'Get started',
  '/privacy': 'Privacy',
  '/terms': 'Terms',
  '/delete-account': 'Delete account',
}

/** Longest-prefix match so nested routes still resolve to their parent's title. */
export function pageTitleFor(pathname) {
  const everything = [...NAV_SECTIONS.flatMap(s => s.items), ...FOOTER_ITEMS]
  const match = everything
    .filter(i => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
  return match?.label ?? EXTRA_TITLES[pathname] ?? 'Clarity Fleet'
}
