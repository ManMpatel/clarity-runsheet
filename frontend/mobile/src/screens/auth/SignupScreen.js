import { useState } from 'react'
import { View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, MailCheck, Check } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Field, Button } from '../../components/ui'

export default function SignupScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeAreaInsets()

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
      setError(err.response?.data?.message || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas, padding: space['2xl'] }}>
        <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg }}>
          <MailCheck size={28} color={colors.accent} />
        </View>
        <Text style={[type.title2, { color: colors.fg }]}>Check your inbox</Text>
        <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space.xs, marginBottom: space.xl }]}>
          We sent a verification link to {email}
        </Text>
        <Button label='Back to login' variant='secondary' fullWidth={false} onPress={() => navigation.navigate('Login')} style={{ paddingHorizontal: space['2xl'] }} />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top }} keyboardShouldPersistTaps='handled'>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: space.lg, alignSelf: 'flex-start' }}>
          <ChevronLeft size={26} color={colors.fg} />
        </Pressable>

        <View style={{ paddingHorizontal: space['2xl'], paddingBottom: space['3xl'] }}>
          <Text style={[type.title1, { color: colors.fg }]}>Create your account</Text>
          <Text style={[type.body, { color: colors.fgMuted, marginTop: space.xs, marginBottom: space['2xl'] }]}>
            Set up your company on Clarity Fleet
          </Text>

          {!!error && (
            <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.lg }}>
              <Text style={[type.caption, { color: colors.dangerFg }]}>{error}</Text>
            </View>
          )}

          <Field label='Company name' value={companyName} onChangeText={setCompanyName} placeholder='e.g. Acme Logistics' autoCapitalize='words' />
          <Field label='Your name' value={name} onChangeText={setName} placeholder='John Doe' autoCapitalize='words' />
          <Field label='Email address' value={email} onChangeText={setEmail} placeholder='john.doe@acmelogistics.com' autoCapitalize='none' keyboardType='email-address' />
          <Field label='Password' value={password} onChangeText={setPassword} placeholder='At least 8 characters' secureTextEntry />
          <Field label='Confirm password' value={confirmPassword} onChangeText={setConfirmPassword} placeholder='Re-enter password' secureTextEntry />

          <Pressable
            onPress={() => setDriverConsent(v => !v)}
            style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.lg }}
          >
            <View style={{
              width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, marginTop: 1, marginRight: space.sm,
              borderColor: driverConsent ? colors.accent : colors.border,
              backgroundColor: driverConsent ? colors.accent : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {driverConsent && <Check size={13} color={colors.fgOnAccent} />}
            </View>
            <Text style={[type.caption, { flex: 1, color: colors.fgMuted, lineHeight: 18 }]}>
              I confirm all drivers have been informed their vehicle is tracked
            </Text>
          </Pressable>

          <Button label='Create account' loading={loading} onPress={handleSubmit} />
          <Button label='Cancel' variant='ghost' onPress={() => navigation.navigate('Login')} style={{ marginTop: space.sm }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
