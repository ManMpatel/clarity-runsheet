import { View, Text } from 'react-native'
import { Receipt } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { Header } from '../../components/ui'

export default function BillingScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Billing' onBack={() => navigation.goBack()} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['2xl'] }}>
        <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg }}>
          <Receipt size={26} color={colors.fgMuted} />
        </View>
        <Text style={[type.title3, { color: colors.fg, textAlign: 'center' }]}>Billing isn't set up yet</Text>
        <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space.sm }]}>
          Online payments and invoices aren't available yet. For now, plan changes go through the Upgrade request form, and we'll follow up directly.
        </Text>
      </View>
    </View>
  )
}
