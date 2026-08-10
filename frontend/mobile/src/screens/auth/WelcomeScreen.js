import { View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'

// New — the old app dropped straight into LoginScreen with no brand moment at all. Uber-style
// full-bleed dark hero as the very first thing a new install sees, with Sign in / Create account
// as the two entry points instead of guessing which one someone wants.
//
// Deliberately dark regardless of the device's light/dark setting (like Uber's own splash/auth
// screens) — the shared <Button/> pulls its colours from useTheme() and would render invisible
// text in light mode against this permanently-dark background, so this screen uses its own
// plain Pressables instead of the themed kit.
export default function WelcomeScreen({ navigation }) {
  const { space, radius, type } = useTheme()
  const insets = useSafeAreaInsets()

  function go(screen) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    navigation.navigate(screen)
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F', justifyContent: 'space-between', paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space['2xl'] }}>
        <View style={{
          width: 72, height: 72, borderRadius: 20, backgroundColor: '#6366f1',
          alignItems: 'center', justifyContent: 'center', marginBottom: space.xl,
        }}>
          <Text style={{ color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 26 }}>CF</Text>
        </View>
        <Text style={[type.display, { color: '#fff', textAlign: 'center' }]}>Clarity Fleet</Text>
        <Text style={[type.body, { color: '#a1a1aa', textAlign: 'center', marginTop: space.sm, maxWidth: 280 }]}>
          Live GPS tracking, driver safety, and fleet insight — in your pocket.
        </Text>
      </View>

      <View style={{ paddingHorizontal: space['2xl'] }}>
        <Pressable
          onPress={() => go('Login')}
          style={({ pressed }) => ({
            height: 52, borderRadius: radius.md, backgroundColor: '#6366f1',
            alignItems: 'center', justifyContent: 'center', marginBottom: space.md,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Text style={[type.bodySemibold, { color: '#fff' }]}>Sign in</Text>
        </Pressable>
        <Pressable
          onPress={() => go('Signup')}
          style={({ pressed }) => ({
            height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: '#3f3f46',
            alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={[type.bodySemibold, { color: '#fff' }]}>Create an account</Text>
        </Pressable>
      </View>
    </View>
  )
}
