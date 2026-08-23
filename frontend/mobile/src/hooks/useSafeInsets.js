import { Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Constants from 'expo-constants'

// Edge-to-edge Android can report 0 insets on the first frames (and on some devices, at all),
// which is what lets the map/pill collide with the status bar and the tab bar sit in the
// gesture/nav region. Prefer the native inset, then fall back to the status-bar height / a
// minimum nav clearance so chrome never draws under system UI.
export function useSafeInsets() {
  const insets = useSafeAreaInsets()
  const statusBarHeight = StatusBar.currentHeight || Constants.statusBarHeight || 0

  return {
    top: Math.max(insets.top, Platform.OS === 'android' ? statusBarHeight : 0),
    bottom: Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 0),
    left: insets.left,
    right: insets.right,
  }
}
