import { View, Text } from 'react-native'
import { useTheme } from '../../theme'

// Single source of truth for what a vehicle-state colour is on mobile — mirrors
// frontend/web/src/lib/fleet-status.js's OFFLINE_AFTER_MS convention and the status* tokens in
// theme/tokens.js (ported from the web dashboard). Every map marker, stat tile, and list row
// status pill goes through this so "moving" never renders a different colour in two places again.
export function statusColor(colors, status) {
  return {
    moving: colors.statusMoving,
    idle: colors.statusIdle,
    stopped: colors.statusStopped,
    offline: colors.statusOffline,
  }[status] || colors.statusStopped
}

export default function StatusDot({ status, label, size = 8 }) {
  const { colors, space, type } = useTheme()
  const color = statusColor(colors, status)

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, marginRight: space.xs }} />
      {!!label && <Text style={[type.captionMedium, { color: colors.fgMuted }]}>{label}</Text>}
    </View>
  )
}
