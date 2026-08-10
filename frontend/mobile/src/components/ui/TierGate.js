import { View, Text } from 'react-native'
import { Lock } from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { useTheme } from '../../theme'
import { TIER_LABELS } from '../../lib/pricing'
import Button from './Button'

// Replaces components/LockedFeature.js — same purpose (an upsell screen for a feature the
// company's subscriptionTier doesn't cover) but routes to the real Upgrade screen (built as part
// of this rebuild) instead of popping an Alert telling the user to email support.
export default function TierGate({ feature, requiredTier = 'top', description }) {
  const { colors, space, radius, type } = useTheme()
  const navigation = useNavigation()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['3xl'], backgroundColor: colors.canvas }}>
      <View style={{
        width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.accentSoft,
        alignItems: 'center', justifyContent: 'center', marginBottom: space.lg,
      }}>
        <Lock size={26} color={colors.accent} strokeWidth={2} />
      </View>
      <Text style={[type.title2, { color: colors.fg, textAlign: 'center' }]}>
        {feature} is a {TIER_LABELS[requiredTier]} Tier feature
      </Text>
      {!!description && (
        <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space.sm }]}>{description}</Text>
      )}
      <Button
        label='View plans'
        onPress={() => navigation.navigate('Upgrade')}
        fullWidth={false}
        style={{ marginTop: space.xl, paddingHorizontal: space['2xl'] }}
      />
    </View>
  )
}
