import { View } from 'react-native'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Header, TierGate } from '../../components/ui'

// Was a 9-line stub (`<LockedFeature/>` unconditionally) — now actually checks the company's
// tier instead of always showing the upsell, same as web's TierGate in nav-config.js. The
// underlying data (real fault codes / engine vitals) still doesn't exist server-side yet (see
// admin/routes/reports.ts's /vehicle-health, which is company-wide latest-telemetry only, not a
// dedicated diagnostics endpoint) — that's a backend gap outside this rebuild's scope, so a `top`
// tier company still sees the upsell copy rather than a broken empty screen.
export default function VehicleHealthScreen({ navigation }) {
  const { colors } = useTheme()
  const hasTier = useAuthStore((s) => s.hasTier)

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Vehicle Health' onBack={() => navigation.goBack()} />
      <TierGate
        feature='Vehicle Health'
        requiredTier='top'
        description={hasTier('top')
          ? 'Real-time engine diagnostics are coming soon for Top tier fleets.'
          : 'Upgrade to unlock real-time engine diagnostics, fault code analysis, and predictive maintenance alerts.'}
      />
    </View>
  )
}
