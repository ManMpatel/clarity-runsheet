import { View } from 'react-native'
import { useTheme } from '../../theme'
import { Header, TierGate } from '../../components/ui'

// No backend endpoint exists for this at all — `multer` is an installed-but-unused dependency
// (backend/package.json) and there's no upload route anywhere in src/. Stays an upsell screen
// rather than a broken "feature" until that's built.
export default function DashcamScreen({ navigation }) {
  const { colors } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Dashcam' onBack={() => navigation.goBack()} />
      <TierGate
        feature='Dashcam'
        requiredTier='top'
        description='Upgrade to unlock event-triggered video clips and on-demand footage from your vehicles.'
      />
    </View>
  )
}
