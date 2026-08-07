import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuthStore } from '../stores/authStore'


import LoginScreen    from '../screens/auth/LoginScreen'
import SignupScreen   from '../screens/auth/SignupScreen'
import HomeScreen     from '../screens/main/HomeScreen'
import TripsScreen    from '../screens/main/TripsScreen'
import AlertsScreen   from '../screens/main/AlertsScreen'
import ScoreScreen    from '../screens/main/ScoreScreen'
import SettingsScreen from '../screens/main/SettingsScreen'
import DriversScreen     from '../screens/main/DriversScreen'
import MaintenanceScreen from '../screens/main/MaintenanceScreen'
import ProfileScreen     from '../screens/main/ProfileScreen'
import CompanyScreen     from '../screens/main/CompanyScreen'
import VehiclesScreen    from '../screens/main/VehiclesScreen'
import UsersScreen       from '../screens/main/UsersScreen'
import FbtLogbookScreen  from '../screens/main/FbtLogbookScreen'
import GeofenceScreen      from '../screens/main/GeofenceScreen'
import VehicleHealthScreen from '../screens/main/VehicleHealthScreen'
import DashcamScreen       from '../screens/main/DashcamScreen'
import MyPlanScreen        from '../screens/main/MyPlanScreen'
import ReportsScreen       from '../screens/main/ReportsScreen'
import UpgradeScreen       from '../screens/main/UpgradeScreen'
import BillingScreen       from '../screens/main/BillingScreen'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          const icons = {
            Map:      'map',
            Trips:    'route',
            Alerts:   'notifications',
            Score:    'speed',
            Settings: 'settings',
          }
          return <MaterialIcons name={icons[route.name]} size={size} color={color} />
        },
        tabBarActiveTintColor:   '#2563eb',
        tabBarInactiveTintColor: '#9ca3af',
        headerShown: false,
      })}
    >
      <Tab.Screen name='Map'      component={HomeScreen} />
      <Tab.Screen name='Trips'    component={TripsScreen} />
      <Tab.Screen name='Alerts'   component={AlertsScreen} />
      <Tab.Screen name='Score'    component={ScoreScreen} />
      <Tab.Screen name='Settings' component={SettingsStack} />
    </Tab.Navigator>
  )
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      <Stack.Screen name='SettingsHome' component={SettingsScreen} options={{ title: 'Settings' }} />
      <Stack.Screen name='Profile' component={ProfileScreen} options={{ title: 'Profile' }} />
      <Stack.Screen name='Company' component={CompanyScreen} options={{ title: 'Company' }} />
      <Stack.Screen name='Vehicles' component={VehiclesScreen} options={{ title: 'Vehicles' }} />
      <Stack.Screen name='Drivers' component={DriversScreen} options={{ title: 'Drivers' }} />
      <Stack.Screen name='Users' component={UsersScreen} options={{ title: 'Users' }} />
      <Stack.Screen name='Maintenance' component={MaintenanceScreen} options={{ title: 'Maintenance' }} />
      <Stack.Screen name='FbtLogbook' component={FbtLogbookScreen} options={{ title: 'FBT Logbook' }} />
      <Stack.Screen name='Geofence' component={GeofenceScreen} options={{ title: 'Geofence Manager' }} />
      <Stack.Screen name='VehicleHealth' component={VehicleHealthScreen} options={{ title: 'Vehicle Health' }} />
      <Stack.Screen name='Dashcam' component={DashcamScreen} options={{ title: 'Dashcam' }} />
      <Stack.Screen name='MyPlan' component={MyPlanScreen} options={{ title: 'My Plan' }} />
      <Stack.Screen name='Reports' component={ReportsScreen} options={{ title: 'Reports' }} />
      <Stack.Screen name='Upgrade' component={UpgradeScreen} options={{ title: 'Upgrade' }} />
      <Stack.Screen name='Billing' component={BillingScreen} options={{ title: 'Billing' }} />
    </Stack.Navigator>
  )
}

export default function RootNavigator() {
  const { user, loading, init } = useAuthStore()

  useEffect(() => { init() }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size='large' color='#2563eb' />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name='Main' component={MainTabs} />
      ) : (
        <>
          <Stack.Screen name='Login' component={LoginScreen} />
          <Stack.Screen name='Signup' component={SignupScreen} />
        </>
      )}
    </Stack.Navigator>
  )
}