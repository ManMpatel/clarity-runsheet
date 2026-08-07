import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { colors, radius, spacing } from '../lib/theme'

export default function LockedFeature({ title, description }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconBadge}>
        <MaterialIcons name='lock' size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title} is a Top Tier feature</Text>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity
        style={styles.upgradeBtn}
        onPress={() => Alert.alert('Coming soon', 'Upgrades will be available once billing is set up — contact support@claritysoftware.au for now.')}
      >
        <Text style={styles.upgradeBtnText}>Upgrade Now</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background },
  iconBadge: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.sm },
  description: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg, lineHeight: 20 },
  upgradeBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 32 },
  upgradeBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
})