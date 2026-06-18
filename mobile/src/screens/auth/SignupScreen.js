import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Switch } from 'react-native'
import api from '../../lib/api'

export default function SignupScreen({ navigation }) {
  const [companyName, setCompanyName] = useState('')
  const [name, setName]               = useState('')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [driverConsent, setDriverConsent]     = useState(false)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')
  const [done, setDone]               = useState(false)

  async function handleSubmit() {
    setError('')

    if (!companyName || !name || !email || !password) {
      setError('All fields are required')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!driverConsent) {
      setError('Please confirm driver consent to continue')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/signup', { companyName, name, email, password, driverConsent })
      setDone(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={styles.center}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.doneTitle}>Check your inbox</Text>
        <Text style={styles.doneSub}>We sent a verification link to {email}</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Start tracking your fleet in minutes</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Text style={styles.label}>Company name</Text>
      <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder='Your business name' autoCapitalize='words' />

      <Text style={styles.label}>Your name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder='Full name' autoCapitalize='words' />

      <Text style={styles.label}>Email</Text>
      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder='you@business.com' autoCapitalize='none' keyboardType='email-address' />

      <Text style={styles.label}>Password</Text>
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder='At least 8 characters' secureTextEntry />

      <Text style={styles.label}>Confirm password</Text>
      <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder='Re-enter password' secureTextEntry />

      <View style={styles.consentRow}>
        <Switch value={driverConsent} onValueChange={setDriverConsent} />
        <Text style={styles.consentText}>I confirm I have consent to track vehicles and drivers in my fleet</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color='#fff' /> : <Text style={styles.buttonText}>Create account</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.loginLink}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#fff' },
  content:      { padding: 24, paddingTop: 60 },
  title:        { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  error:        { color: '#dc2626', fontSize: 13, marginBottom: 16 },
  label:        { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input:        { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#111827' },
  consentRow:   { flexDirection: 'row', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  consentText:  { flex: 1, marginLeft: 10, fontSize: 12, color: '#4b5563' },
  button:       { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  buttonText:   { color: '#fff', fontSize: 15, fontWeight: '600' },
  loginLink:    { textAlign: 'center', color: '#2563eb', fontSize: 13, marginTop: 18 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  emoji:        { fontSize: 48, marginBottom: 16 },
  doneTitle:    { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  doneSub:      { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  linkButton:   { paddingVertical: 10 },
  linkText:     { color: '#2563eb', fontSize: 14, fontWeight: '600' },
})