import { ScrollView, View, Text, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Building2, Truck, Users as UsersIcon, IdCard, Wrench, MapPin, HeartPulse,
  Video, BarChart3, CreditCard, ArrowUpCircle, Receipt, Palette, LogOut,
} from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Avatar, ListRow, Card } from '../../components/ui'

const SECTIONS = [
  {
    title: 'Fleet',
    items: [
      { label: 'Vehicles', icon: Truck, screen: 'Vehicles' },
      { label: 'Drivers', icon: IdCard, screen: 'Drivers' },
      { label: 'Maintenance', icon: Wrench, screen: 'Maintenance' },
      { label: 'Geofence Manager', icon: MapPin, screen: 'Geofence' },
      { label: 'Vehicle Health', icon: HeartPulse, screen: 'VehicleHealth' },
      { label: 'Dashcam', icon: Video, screen: 'Dashcam' },
      { label: 'Reports', icon: BarChart3, screen: 'Reports' },
    ],
  },
  {
    title: 'Organisation',
    items: [
      { label: 'Company', icon: Building2, screen: 'Company' },
      { label: 'Team', icon: UsersIcon, screen: 'Users' },
    ],
  },
  {
    title: 'Billing',
    items: [
      { label: 'My Plan', icon: CreditCard, screen: 'MyPlan' },
      { label: 'Upgrade', icon: ArrowUpCircle, screen: 'Upgrade' },
      { label: 'Billing', icon: Receipt, screen: 'Billing' },
    ],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Appearance', icon: Palette, screen: 'Appearance' },
    ],
  },
]

export default function AccountHomeScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeAreaInsets()
  const { user, logout } = useAuthStore()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: space['5xl'] }}>
      <Pressable onPress={() => navigation.navigate('Profile')} style={{ paddingHorizontal: space.lg, marginBottom: space.xl }}>
        <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Avatar name={user?.name} size={52} />
          <View style={{ marginLeft: space.md, flex: 1 }}>
            <Text style={[type.title3, { color: colors.fg }]} numberOfLines={1}>{user?.name || 'Your account'}</Text>
            <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]} numberOfLines={1}>{user?.email}</Text>
          </View>
        </Card>
      </Pressable>

      {SECTIONS.map((section) => (
        <View key={section.title} style={{ marginBottom: space.xl }}>
          <Text style={[type.captionMedium, { color: colors.fgSubtle, marginLeft: space.lg + space.lg, marginBottom: space.xs, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
            {section.title}
          </Text>
          <View style={{ marginHorizontal: space.lg, backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border }}>
            {section.items.map((item, i) => (
              <View key={item.screen}>
                <ListRow
                  icon={<item.icon size={19} color={colors.fgMuted} />}
                  title={item.label}
                  onPress={() => navigation.navigate(item.screen)}
                />
                {i < section.items.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: space.lg + 19 + space.md }} />}
              </View>
            ))}
          </View>
        </View>
      ))}

      <Pressable
        onPress={logout}
        style={{
          marginHorizontal: space.lg, height: 48, borderRadius: radius.md,
          borderWidth: 1, borderColor: colors.danger, alignItems: 'center', justifyContent: 'center',
          flexDirection: 'row',
        }}
      >
        <LogOut size={16} color={colors.danger} />
        <Text style={[type.bodySemibold, { color: colors.danger, marginLeft: space.sm }]}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}
