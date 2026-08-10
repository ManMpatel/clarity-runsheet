import { Text, Pressable } from 'react-native'
import { useTheme } from '../../theme'

// Filter chips (Map's moving/idle/stopped/overspeed row, Trips/Alerts filter bars). `color`
// overrides the active fill for semantic filters (e.g. red for "overspeed").
export default function Chip({ label, active, onPress, color }) {
  const { colors, space, radius, type } = useTheme()
  const activeColor = color || colors.accent

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.xs + 2,
        borderRadius: radius.full,
        backgroundColor: active ? activeColor : colors.surface2,
        borderWidth: active ? 0 : 1,
        borderColor: colors.border,
        marginRight: space.sm,
      }}
    >
      <Text style={[type.captionMedium, { color: active ? colors.fgOnAccent : colors.fgMuted }]}>{label}</Text>
    </Pressable>
  )
}
