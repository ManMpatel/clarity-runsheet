import { useState } from 'react'
import { View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Switch } from '../../components/ui'
import {
  AuthButton,
  AuthHeader,
  GroupedList,
  GroupedField,
  GroupedRow,
  GroupedFooter,
  SuccessState,
} from '../../components/auth'

export default function SignupScreen({ navigation }) {
  const { colors, space, appleType } = useTheme()
  const insets = useSafeInsets()

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
      <View style={{ flex: 1, backgroundColor: colors.iosGroupedBg }}>
        <SuccessState
          title='Check your inbox'
          message={`We sent a verification link to ${email}`}
          actionLabel='Back to Sign In'
          onAction={() => navigation.navigate('Login')}
        />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.iosGroupedBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + space['2xl'],
        }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title='Create Account'
          subtitle='Set up your company on Clarity Fleet'
          onBack={() => navigation.goBack()}
        />

        {/* Apple splits a long form into semantic groups rather than one running list — who you
            are, then how you sign in, then what you're agreeing to. Labels are kept short so they
            fit GroupedField's fixed label column without truncating. */}
        <GroupedList style={{ marginTop: space['3xl'] }}>
          <GroupedField
            label='Company'
            value={companyName}
            onChangeText={setCompanyName}
            placeholder='Acme Logistics'
            autoCapitalize='words'
            textContentType='organizationName'
          />
          <GroupedField
            label='Name'
            value={name}
            onChangeText={setName}
            placeholder='Your full name'
            autoCapitalize='words'
            textContentType='name'
            autoComplete='name'
          />
          <GroupedField
            label='Email'
            value={email}
            onChangeText={setEmail}
            placeholder='you@company.com.au'
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='emailAddress'
            autoComplete='email'
          />
        </GroupedList>

        <GroupedList style={{ marginTop: space['2xl'] }}>
          <GroupedField
            label='Password'
            value={password}
            onChangeText={setPassword}
            placeholder='At least 8 characters'
            secureTextEntry
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='newPassword'
            autoComplete='new-password'
          />
          <GroupedField
            label='Confirm'
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder='Re-enter password'
            secureTextEntry
            autoCapitalize='none'
            autoCorrect={false}
            textContentType='newPassword'
            autoComplete='new-password'
          />
        </GroupedList>

        <GroupedList style={{ marginTop: space['2xl'] }}>
          <GroupedRow>
            <View style={{ flex: 1, marginRight: space.md }}>
              <Text style={[appleType.body, { color: colors.fg }]}>Driver Consent</Text>
              <Text style={[appleType.footnote, { color: colors.iosLabelSecondary, marginTop: 2 }]}>
                All drivers have been informed their vehicle is tracked.
              </Text>
            </View>
            <Switch value={driverConsent} onValueChange={setDriverConsent} />
          </GroupedRow>
        </GroupedList>

        {/* Validation lives in the footer, where iOS puts it — not in a filled banner. */}
        {!!error && <GroupedFooter tone='danger'>{error}</GroupedFooter>}

        <AuthButton
          label='Create Account'
          loading={loading}
          onPress={handleSubmit}
          style={{ marginTop: space['2xl'] }}
        />
        <AuthButton
          variant='plain'
          label='Cancel'
          onPress={() => navigation.navigate('Login')}
          style={{ marginTop: space.xs }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
