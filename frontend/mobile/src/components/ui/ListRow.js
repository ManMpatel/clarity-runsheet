import { View, Text, Pressable, StyleSheet } from 'react-native'
import { ChevronRight } from 'lucide-react-native'
import { useTheme } from '../../theme'

// Uber's tall, icon-left, chevron-right settings row — used for every Account/Settings sub-item
// and most list screens (Vehicles, Drivers, Maintenance…) so navigation reads consistently
// throughout the app.
export default function ListRow({ icon, title, subtitle, right, onPress, showChevron = true, danger = false }) {
  const { colors, space, type } = useTheme()

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.row,
        { paddingVertical: space.lg, paddingHorizontal: space.lg, backgroundColor: pressed ? colors.surface2 : 'transparent' },
      ]}
    >
      {icon && <View style={{ marginRight: space.md }}>{icon}</View>}
      <View style={{ flex: 1 }}>
        <Text style={[type.bodyMedium, { color: danger ? colors.danger : colors.fg }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]} numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right}
      {onPress && showChevron && !right && <ChevronRight size={18} color={colors.fgSubtle} />}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
})
