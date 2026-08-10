import { View, Text, Pressable } from 'react-native'
import { useTheme } from '../../theme'

// Used by Activity (Trips / FBT Logbook) and anywhere else two-to-four mutually exclusive views
// need a compact switcher rather than eating a whole tab.
export default function SegmentedControl({ options, value, onChange }) {
  const { colors, space, radius, type } = useTheme()

  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface2, borderRadius: radius.md, padding: 3 }}>
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: space.sm,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              ...(active ? { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 } : null),
            }}
          >
            <Text style={[type.captionMedium, { color: active ? colors.fg : colors.fgMuted }]}>{opt.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}
