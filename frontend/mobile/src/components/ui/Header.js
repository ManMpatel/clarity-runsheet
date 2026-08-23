import { View, Text, Pressable } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../../theme'

// A consistent large-title header for stack screens under Account — screens set
// `headerShown: false` at the navigator level (see navigation/index.js) and render this
// themselves, so the back button, title, and trailing action all share one layout.
export default function Header({ title, onBack, right }) {
  const { colors, space, type } = useTheme()
  const insets = useSafeInsets()

  return (
    <View style={{ paddingTop: insets.top + space.sm, paddingHorizontal: space.lg, paddingBottom: space.md, backgroundColor: colors.canvas }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -space.sm }}>
            <ChevronLeft size={26} color={colors.fg} />
          </Pressable>
        ) : <View style={{ width: 36 }} />}
        <Text style={[type.title3, { color: colors.fg }]} numberOfLines={1}>{title}</Text>
        <View style={{ width: 36, alignItems: 'flex-end' }}>{right}</View>
      </View>
    </View>
  )
}
