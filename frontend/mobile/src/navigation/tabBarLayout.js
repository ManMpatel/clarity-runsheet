import { space } from '../theme/space'
import { useSafeInsets } from '../hooks/useSafeInsets'

// Icon+label row height. The navigator adds the bottom safe-area inset on top of this so the
// bar sits on the physical bottom edge while the icons stay above the home indicator / nav bar.
export const TAB_BAR_HEIGHT = 56

export function useTabBarSafeBottom() {
  const insets = useSafeInsets()
  return insets.bottom
}

/**
 * Extra `paddingBottom` for a tab screen's scrollable content. The tab bar is in the layout
 * (not overlaid), so this is breathing room above the bar rather than space reserved for it.
 */
export function useTabBarClearance() {
  return space.xl
}
