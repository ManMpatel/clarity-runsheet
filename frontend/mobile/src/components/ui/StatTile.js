import { Text, Pressable } from 'react-native'
import { useTheme } from '../../theme'

// The fleet-count tiles at the top of the Map screen (Moving/Idle/Stopped/Overspeed) — also
// reused on Score/Dashboard-style summaries wherever a tappable filter + count pairing shows up.
export default function StatTile({ label, value, color, active, onPress }) {
  const { colors, space, radius, type } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: space.sm,
        borderRadius: radius.md,
        backgroundColor: active ? color + '1F' : 'transparent',
      }}
    >
      <Text style={[type.tabularBody, { color, fontSize: 18 }]}>{value}</Text>
      <Text style={[type.micro, { color: colors.fgMuted, marginTop: 2 }]}>{label}</Text>
    </Pressable>
  )
}
