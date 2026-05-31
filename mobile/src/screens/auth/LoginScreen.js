import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert
} from 'react-native'
import { useAuthStore } from '../../stores/authStore'

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const login = useAuthStore(s => s.login)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password')
      return
    }
    setLoading(true)
    try {
      await login(email.toLowerCase().trim(), password)
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.error || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>Clarity Fleet</Text>
        <Text style={styles.sub}>Fleet management platform</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder='name@company.com.au'
          keyboardType='email-address'
          autoCapitalize='none'
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder='Your password'
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? 'Signing in...' : 'Sign in'}
          </Text>
        </TouchableOpacity>

        {/* <TouchableOpacity
          style={styles.link}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.linkText}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity> */}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#fff' },
  inner:      { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
  logo:       { fontSize: 28, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 },
  sub:        { fontSize: 14, color: '#6b7280', marginBottom: 40 },
  label:      { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 4 },
  input:      { height: 44, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
                paddingHorizontal: 12, fontSize: 14, color: '#111827', marginBottom: 14 },
  btn:        { height: 44, backgroundColor: '#2563eb', borderRadius: 8,
                alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  btnDisabled:{ backgroundColor: '#93c5fd' },
  btnText:    { color: '#fff', fontSize: 15, fontWeight: '600' },
  link:       { alignItems: 'center', marginTop: 20 },
  linkText:   { fontSize: 13, color: '#2563eb' },
})