import { View, Text, Pressable } from 'react-native'
import { Sun, Moon, SmartphoneNfc, Check } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { Header, Card } from '../../components/ui'

// Light is the default. Dark and System remain available and persist via ThemeProvider.
const OPTIONS = [
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: SmartphoneNfc },
]

export default function AppearanceScreen({ navigation }) {
  const { colors, space, type, preference, setThemeOverride } = useTheme()
  const current = preference || 'light'

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Appearance' onBack={() => navigation.goBack()} />
      <View style={{ padding: space.lg }}>
        <Card padded={false}>
          {OPTIONS.map((opt, i) => (
            <View key={opt.key}>
              <Pressable
                onPress={() => setThemeOverride(opt.key)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: space.md }}
              >
                <opt.icon size={19} color={colors.fgMuted} />
                <Text style={[type.bodyMedium, { color: colors.fg, marginLeft: space.md, flex: 1 }]}>{opt.label}</Text>
                {current === opt.key && <Check size={18} color={colors.accent} />}
              </Pressable>
              {i < OPTIONS.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: space.md + 19 + space.md }} />}
            </View>
          ))}
        </Card>
      </View>
    </View>
  )
}
