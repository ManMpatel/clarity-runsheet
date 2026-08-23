import { View, Text } from 'react-native'
import { useTheme } from '../../theme'

// One row of the welcome screen's feature list — Apple's own onboarding pattern (Health, Fitness,
// TV all open with three of these). Tinted icon in a fixed left column so the titles align down
// the list regardless of icon width, then a title and a secondary description.
//
// The tinted icon is a deliberate, scoped exception to tokens.js's "accent is for actions, not
// decoration" rule: on this pattern the tint IS the visual system. See DECISIONS.md D-017.
export default function FeatureRow({ icon: Icon, title, description }) {
  const { colors, space, appleType } = useTheme()

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space['2xl'] }}>
      <View style={{ width: 44, alignItems: 'center', paddingTop: 2 }}>
        <Icon size={30} color={colors.accentFg} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, marginLeft: space.md }}>
        <Text style={[appleType.headline, { color: colors.fg }]}>{title}</Text>
        <Text style={[appleType.subheadline, { color: colors.iosLabelSecondary, marginTop: 2 }]}>
          {description}
        </Text>
      </View>
    </View>
  )
}
