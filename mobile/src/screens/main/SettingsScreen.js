import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useAuthStore } from '../../stores/authStore'

export default function SettingsScreen() {
  const { user, logout } = useAuthStore()

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {user && (
        <Text style={styles.email}>{user.email}</Text>
      )}
      <TouchableOpacity style={styles.btn} onPress={logout}>
        <Text style={styles.btnText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  email:     { fontSize: 13, color: '#6b7280', marginBottom: 32 },
  btn:       { height: 44, paddingHorizontal: 32, backgroundColor: '#ef4444',
               borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText:   { color: '#fff', fontSize: 14, fontWeight: '600' },
})