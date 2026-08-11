import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { BlurView } from 'expo-blur'
import { MapPin, Route as RouteIcon, Bell, CircleUserRound } from 'lucide-react-native'
import { useAuthStore } from '../stores/authStore'
import { useTheme } from '../theme'
import { useUnreadAlertCount } from '../hooks/useUnreadAlertCount'
import { useNotificationDeepLink } from '../hooks/useNotificationDeepLink'
import { TAB_BAR_HEIGHT, useTabBarBottomOffset } from './tabBarLayout'

import WelcomeScreen from '../screens/auth/WelcomeScreen'
import LoginScreen from '../screens/auth/LoginScreen'
import SignupScreen from '../screens/auth/SignupScreen'
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen'

import MapScreen from '../screens/main/MapScreen'
import ActivityScreen from '../screens/main/ActivityScreen'
import TripReplayScreen from '../screens/main/TripReplayScreen'
import AlertsScreen from '../screens/main/AlertsScreen'

import AccountHomeScreen from '../screens/account/AccountHomeScreen'
import ProfileScreen from '../screens/account/ProfileScreen'
import CompanyScreen from '../screens/account/CompanyScreen'
import VehiclesScreen from '../screens/account/VehiclesScreen'
import DriversScreen from '../screens/account/DriversScreen'
import UsersScreen from '../screens/account/UsersScreen'
import MaintenanceScreen from '../screens/account/MaintenanceScreen'
import GeofenceScreen from '../screens/account/GeofenceScreen'
import VehicleHealthScreen from '../screens/account/VehicleHealthScreen'
import DashcamScreen from '../screens/account/DashcamScreen'
import ReportsScreen from '../screens/account/ReportsScreen'
import MyPlanScreen from '../screens/account/MyPlanScreen'
import UpgradeScreen from '../screens/account/UpgradeScreen'
import BillingScreen from '../screens/account/BillingScreen'
import AppearanceScreen from '../screens/account/AppearanceScreen'

const RootStack = createNativeStackNavigator()
const AuthStack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()
const AccountStack = createNativeStackNavigator()

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name='Welcome' component={WelcomeScreen} />
      <AuthStack.Screen name='Login' component={LoginScreen} />
      <AuthStack.Screen name='Signup' component={SignupScreen} />
      <AuthStack.Screen name='ForgotPassword' component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  )
}

// Uber's floating translucent tab bar — position:absolute + a blurred background instead of the
// RN default opaque bar glued to the bottom edge. `tabBarBackground` is the supported extension
// point for this in @react-navigation/bottom-tabs v6.
function TabBarBackground() {
  const { scheme } = useTheme()
  return (
    <BlurView
      intensity={80}
      tint={scheme === 'dark' ? 'dark' : 'light'}
      style={StyleSheet.absoluteFill}
    />
  )
}

function AppTabs() {
  const { colors, space, radius } = useTheme()
  const unread = useUnreadAlertCount()
  // Clears the iOS home indicator. At a flat 16pt the bar sat inside the home-indicator gesture
  // area, so a swipe near a tab was ambiguous between switching tabs and going home.
  const bottomOffset = useTabBarBottomOffset()

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.fgSubtle,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          left: space.lg,
          right: space.lg,
          bottom: bottomOffset,
          height: TAB_BAR_HEIGHT,
          borderRadius: radius.xl,
          borderTopWidth: 0,
          overflow: 'hidden',
          elevation: 8,
          shadowColor: '#000',
          shadowOpacity: 0.15,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        },
        tabBarItemStyle: { paddingTop: 8 },
        tabBarLabelStyle: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
        tabBarIcon: ({ color, size, focused }) => {
          const props = { color, size: size - 2, strokeWidth: focused ? 2.4 : 2 }
          if (route.name === 'Map') return <MapPin {...props} />
          if (route.name === 'Activity') return <RouteIcon {...props} />
          if (route.name === 'Alerts') return <Bell {...props} />
          if (route.name === 'Account') return <CircleUserRound {...props} />
          return null
        },
        tabBarBadge: route.name === 'Alerts' && unread > 0 ? unread : undefined,
        tabBarBadgeStyle: { backgroundColor: colors.danger, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
      })}
    >
      <Tab.Screen name='Map' component={MapScreen} />
      <Tab.Screen name='Activity' component={ActivityScreen} />
      <Tab.Screen name='Alerts' component={AlertsScreen} />
      <Tab.Screen name='Account' component={AccountNavigator} />
    </Tab.Navigator>
  )
}

// Every screen here renders `headerShown:false` and draws its own <Header/> (see components/ui/
// Header.js) so the back chevron, title, and safe-area padding are identical everywhere —
// AccountHomeScreen is the one exception, which draws its own large-title layout instead since
// it's a tab root with no back button.
function AccountNavigator() {
  return (
    <AccountStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountStack.Screen name='AccountHome' component={AccountHomeScreen} />
      <AccountStack.Screen name='Profile' component={ProfileScreen} />
      <AccountStack.Screen name='Company' component={CompanyScreen} />
      <AccountStack.Screen name='Vehicles' component={VehiclesScreen} />
      <AccountStack.Screen name='Drivers' component={DriversScreen} />
      <AccountStack.Screen name='Users' component={UsersScreen} />
      <AccountStack.Screen name='Maintenance' component={MaintenanceScreen} />
      <AccountStack.Screen name='Geofence' component={GeofenceScreen} />
      <AccountStack.Screen name='VehicleHealth' component={VehicleHealthScreen} />
      <AccountStack.Screen name='Dashcam' component={DashcamScreen} />
      <AccountStack.Screen name='Reports' component={ReportsScreen} />
      <AccountStack.Screen name='MyPlan' component={MyPlanScreen} />
      <AccountStack.Screen name='Upgrade' component={UpgradeScreen} />
      <AccountStack.Screen name='Billing' component={BillingScreen} />
      <AccountStack.Screen name='Appearance' component={AppearanceScreen} />
    </AccountStack.Navigator>
  )
}

export default function RootNavigator() {
  const { colors } = useTheme()
  const { user, loading, init } = useAuthStore()

  useEffect(() => { init() }, [])
  useNotificationDeepLink()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}>
        <ActivityIndicator size='large' color={colors.accent} />
      </View>
    )
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <RootStack.Screen name='Tabs' component={AppTabs} />
          <RootStack.Screen name='TripReplay' component={TripReplayScreen} options={{ presentation: 'modal' }} />
        </>
      ) : (
        <RootStack.Screen name='Auth' component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  )
}
