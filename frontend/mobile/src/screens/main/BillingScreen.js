import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../../lib/theme'

export default function BillingScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <MaterialIcons name='payments' size={28} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>Billing isn't set up yet</Text>
      <Text style={styles.description}>
        Online payments and invoices aren't available yet. For now, plan changes go through the Upgrade request form, and we'll follow up directly.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  iconBadge: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
})