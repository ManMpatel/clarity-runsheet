import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { space } from '../theme/space'

// The tab bar floats (position:absolute, inset from the edges) rather than sitting in the layout,
// so nothing reserves space for it — every tab screen has to pad its own scroll content past it or
// the last row ends up underneath. These constants are the single source for that geometry so the
// bar and the padding can't drift apart; navigation/index.js styles the bar from the same numbers.
export const TAB_BAR_HEIGHT = 64

/**
 * Distance from the bottom of the screen to the bottom of the floating tab bar.
 *
 * On a device with a home indicator this has to clear it: at a flat 16pt the bar sat directly in
 * the home-indicator gesture area, where swipes fight between "switch tab" and "go home".
 */
export function useTabBarBottomOffset() {
  const insets = useSafeAreaInsets()
  return Math.max(insets.bottom, space.lg)
}

/**
 * `paddingBottom` for a tab screen's scrollable content. Screens previously used space['5xl'] (56)
 * against a bar occupying at least 80pt, so the final list item was always partly hidden.
 */
export function useTabBarClearance() {
  const bottomOffset = useTabBarBottomOffset()
  return bottomOffset + TAB_BAR_HEIGHT + space.lg
}
