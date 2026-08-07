import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

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
      await api.post('/auth/signup', { companyName, name, email, password, driverConsent })
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
        <View style={styles.successIcon}>
          <MaterialIcons name='mark-email-read' size={32} color={colors.primary} />
        </View>
        <Text style={styles.doneTitle}>Check your inbox</Text>
        <Text style={styles.doneSub}>We sent a verification link to {email}</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.linkText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your details</Text>
      <Text style={styles.subtitle}>Create your Clarity Fleet account</Text>

      <View style={styles.card}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.label}>Company Name</Text>
        <TextInput style={styles.input} value={companyName} onChangeText={setCompanyName} placeholder='e.g. Acme Logistics' placeholderTextColor={colors.placeholder} autoCapitalize='words' />

        <Text style={styles.label}>Your Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder='John Doe' placeholderTextColor={colors.placeholder} autoCapitalize='words' />

        <Text style={styles.label}>Email Address</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder='john.doe@acmelogistics.com' placeholderTextColor={colors.placeholder} autoCapitalize='none' keyboardType='email-address' />

        <Text style={styles.label}>Password</Text>
        <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder='At least 8 characters' placeholderTextColor={colors.placeholder} secureTextEntry />

        <Text style={styles.label}>Confirm Password</Text>
        <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder='Re-enter password' placeholderTextColor={colors.placeholder} secureTextEntry />

        <TouchableOpacity style={styles.consentRow} onPress={() => setDriverConsent(!driverConsent)}>
          <View style={[styles.checkbox, driverConsent && styles.checkboxChecked]}>
            {driverConsent && <MaterialIcons name='check' size={14} color={colors.onPrimary} />}
          </View>
          <Text style={styles.consentText}>I confirm all drivers have been informed their vehicle is tracked</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.buttonText}>Create account</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.margin, paddingTop: 60 },
  title:    { fontSize: 24, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 6, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  error:  { color: colors.error, fontSize: 13, marginBottom: spacing.sm },
  label:  { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: spacing.sm },
  input:  { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: spacing.lg, marginBottom: spacing.sm },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm, marginTop: 1,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  button: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  buttonText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  cancelButton: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  cancelText: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.margin, backgroundColor: colors.background },
  successIcon: { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  doneTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  doneSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  linkButton: { paddingVertical: 10 },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
})