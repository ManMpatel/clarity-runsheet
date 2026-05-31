import { useEffect } from 'react'
import { ActivityIndicator, View, Text } from 'react-native'
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

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          const icons = {
            Map:      '🗺️',
            Trips:    '🚐',
            Alerts:   '🔔',
            Score:    '🛡️',
            Settings: '⚙️',
          }
          return (
            <Text style={{ fontSize: 18 }}>
              {icons[route.name]}
            </Text>
          )
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
      <Tab.Screen name='Settings' component={SettingsScreen} />
    </Tab.Navigator>
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
        <Stack.Screen name='Main' component={MainTabs} />
    </Stack.Navigator>
    )
}
