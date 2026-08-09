// Single source of truth for tier pricing across the web dashboard — PlanSection (slot usage +
// monthly total) and Billing (entry-tier checkout card) both read from here so the advertised
// price can never drift out of sync between pages the way $19.99 flat vs $18/$25/$45 tiered did.
// Mirrored (no shared package between web and mobile) at frontend/mobile/src/lib/pricing.js.
export const TIER_PRICING = { entry: 9, mid: 25, top: 45 }
export const TIER_LABELS = { entry: 'Entry', mid: 'Mid', top: 'Top' }

// slots: { entry?, mid?, top? } vehicle counts per tier -> total monthly AUD.
export function monthlyTotal(slots) {
  return Object.entries(TIER_PRICING).reduce(
    (sum, [tier, price]) => sum + (slots?.[tier] || 0) * price,
    0
  )
}
