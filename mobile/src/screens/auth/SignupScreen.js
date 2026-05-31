import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'

export default function SignupScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Text style={styles.sub}>Individual vehicle tracking</Text>
      <Text style={styles.note}>Signup coming soon</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Back to sign in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center',
               backgroundColor: '#fff', paddingHorizontal: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  sub:   { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  note:  { fontSize: 13, color: '#9ca3af', marginBottom: 24 },
  link:  { fontSize: 14, color: '#2563eb' },
})