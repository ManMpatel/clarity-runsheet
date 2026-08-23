import { ScrollView, View, Text, Pressable } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import * as WebBrowser from 'expo-web-browser'
import Constants from 'expo-constants'
import {
  Building2, Truck, Users as UsersIcon, IdCard, Wrench, MapPin, HeartPulse,
  Video, BarChart3, CreditCard, ArrowUpCircle, Receipt, Palette, LogOut,
  Shield, FileText, Bell,
} from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { useTabBarClearance } from '../../navigation/tabBarLayout'
import { Avatar, ListRow, Card } from '../../components/ui'

// App Store Connect requires a reachable privacy policy, and reviewers look for it inside the app
// too. Opened in the in-app browser rather than kicking out to Safari so the user doesn't lose
// their place.
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL || 'https://clarity-software.com.au/privacy'
const TERMS_URL = process.env.EXPO_PUBLIC_TERMS_URL || 'https://clarity-software.com.au/terms'

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
      { label: 'Alert rules', icon: Bell, screen: 'AlertRules' },
      { label: 'Appearance', icon: Palette, screen: 'Appearance' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy Policy', icon: Shield, url: PRIVACY_URL },
      { label: 'Terms of Service', icon: FileText, url: TERMS_URL },
    ],
  },
]

export default function AccountHomeScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeInsets()
  const { user, logout } = useAuthStore()
  const tabBarClearance = useTabBarClearance()

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvas }} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: tabBarClearance }}>
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
              <View key={item.screen || item.url}>
                <ListRow
                  icon={<item.icon size={19} color={colors.fgMuted} />}
                  title={item.label}
                  onPress={() => item.url
                    ? WebBrowser.openBrowserAsync(item.url).catch(() => {})
                    : navigation.navigate(item.screen)}
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

      {/* Worth the two lines: the first thing support asks is "what version are you on". */}
      <Text style={[type.micro, { color: colors.fgSubtle, textAlign: 'center', marginTop: space.lg }]}>
        Clarity Fleet {Constants.expoConfig?.version || '1.0.0'}
      </Text>
    </ScrollView>
  )
}
