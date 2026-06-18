import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useAuthStore } from '../../stores/authStore'
import { colors, radius, spacing } from '../../lib/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const MENU_ITEMS = [
  { label: 'Profile',     icon: 'account-circle', screen: 'Profile' },
  { label: 'Company',     icon: 'business',       screen: 'Company' },
  { label: 'Vehicles',    icon: 'local-shipping',  screen: 'Vehicles' },
  { label: 'Drivers',     icon: 'badge',           screen: 'Drivers' },
  { label: 'Users',       icon: 'group',           screen: 'Users' },
  { label: 'Maintenance', icon: 'build',           screen: 'Maintenance' },
  { label: 'Geofence Manager', icon: 'location-on', screen: 'Geofence' },
  { label: 'Vehicle Health', icon: 'health-and-safety', screen: 'VehicleHealth' },
  { label: 'Dashcam',        icon: 'videocam',          screen: 'Dashcam' },
  { label: 'My Plan',        icon: 'card-membership',   screen: 'MyPlan' },
  { label: 'Reports',        icon: 'bar-chart',         screen: 'Reports' },
  { label: 'Upgrade',        icon: 'upgrade',           screen: 'Upgrade' },
  { label: 'Billing',        icon: 'payments',          screen: 'Billing' },
  { label: 'FBT Logbook', icon: 'description',     screen: 'FbtLogbook' },
]

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuthStore()

  return (
    <ScrollView style={styles.page} contentContainerStyle={[styles.container, { paddingTop: insets.top + 24 }]}>
      {user && (
        <View style={styles.emailCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.email?.[0]?.toUpperCase() || '?'}</Text>
          </View>
          <Text style={styles.email}>{user.email}</Text>
        </View>
      )}

      {MENU_ITEMS.map(item => (
        <TouchableOpacity
          key={item.screen}
          style={styles.menuRow}
          onPress={() => navigation.navigate(item.screen)}
        >
          <View style={styles.menuIconBox}>
            <MaterialIcons name={item.icon} size={20} color={colors.primary} />
          </View>
          <Text style={styles.menuText}>{item.label}</Text>
          <MaterialIcons name='chevron-right' size={22} color={colors.placeholder} />
        </TouchableOpacity>
      ))}

      <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
        <MaterialIcons name='logout' size={18} color={colors.error} />
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: spacing.margin, paddingBottom: 40 },
  emailCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.lg,
  },
  avatar: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: { color: colors.onPrimary, fontWeight: '700', fontSize: 16 },
  email: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 14, paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  menuIconBox: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  menuText: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.error,
    marginTop: spacing.lg, gap: 8,
  },
  signOutText: { color: colors.error, fontSize: 14, fontWeight: '600' },
})