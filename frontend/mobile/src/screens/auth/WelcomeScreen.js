import { View, Text, ScrollView } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { Navigation, ShieldCheck, TrendingUp } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { AuthButton, FeatureRow } from '../../components/auth'

// Apple's onboarding pattern — app mark, "Welcome to <product>" in a large title, three feature
// rows, CTAs pinned at the bottom. It's what Health, Fitness and TV all open with, and unlike the
// bare hero this replaced it actually says what the app does before asking anyone to sign in.
//
// This screen used to be hardcoded to #0B0B0F regardless of the device setting. It now follows the
// system like every other screen, which is what lets it use the themed kit instead of raw hex
// Pressables. See DECISIONS.md D-017.
const FEATURES = [
  {
    icon: Navigation,
    title: 'Live Tracking',
    description: 'Every vehicle on the map, second by second.',
  },
  {
    icon: ShieldCheck,
    title: 'Driver Safety',
    description: 'Harsh braking, speeding and idling, flagged as they happen.',
  },
  {
    icon: TrendingUp,
    title: 'Fleet Insight',
    description: 'Trips, utilisation and running costs in one place.',
  },
]

export default function WelcomeScreen({ navigation }) {
  const { colors, space, appleType } = useTheme()
  const insets = useSafeInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.iosGroupedBg }}>
      {/* Scrolls rather than clips: the feature list plus a large title doesn't fit an iPhone SE. */}
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: insets.top + space['4xl'],
          paddingBottom: space['2xl'],
          paddingHorizontal: space.xl,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: space['4xl'] }}>
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 18,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: space['2xl'],
            }}
          >
            <Text style={[appleType.title1, { color: colors.fgOnAccent }]}>CF</Text>
          </View>

          {/* Tinting the product name is Apple's own treatment on this screen ("Welcome to
              Fitness"). Two lines, because a 34pt large title won't fit on one. */}
          <Text style={[appleType.largeTitle, { color: colors.fg, textAlign: 'center' }]}>
            Welcome to
          </Text>
          <Text style={[appleType.largeTitle, { color: colors.accentFg, textAlign: 'center' }]}>
            Clarity Fleet
          </Text>
        </View>

        <View>
          {FEATURES.map((feature) => (
            <FeatureRow key={feature.title} {...feature} />
          ))}
        </View>
      </ScrollView>

      {/* Outside the ScrollView so the CTAs stay reachable no matter how short the device is. */}
      <View style={{ paddingHorizontal: space.xl, paddingBottom: insets.bottom + space.lg }}>
        <AuthButton label='Sign In' onPress={() => navigation.navigate('Login')} />
        <AuthButton
          variant='plain'
          label='Create an Account'
          onPress={() => navigation.navigate('Signup')}
          style={{ marginTop: space.xs }}
        />
      </View>
    </View>
  )
}
