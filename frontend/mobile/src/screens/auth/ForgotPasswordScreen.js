import { useState } from 'react'
import { View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import {
  AuthButton,
  AuthHeader,
  GroupedList,
  GroupedField,
  GroupedFooter,
  SuccessState,
} from '../../components/auth'

// New — the old app just Linking.openURL'd to the web dashboard's /forgot-password page. The
// backend endpoint (POST /auth/forgot-password) was always mobile-reachable, just never wired up
// from a mobile screen.
export default function ForgotPasswordScreen({ navigation }) {
  const { colors, space } = useTheme()
  const insets = useSafeInsets()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit() {
    if (!email) {
      setError('Enter your email address')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email: email.toLowerCase().trim() })
      setSent(true)
    } catch (err) {
      // Backend deliberately doesn't reveal whether the email exists — any failure here is
      // almost certainly a network issue, not "wrong email".
      setError(err.response?.data?.message || 'Something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.iosGroupedBg }}>
        <SuccessState
          title='Check your inbox'
          message={`If an account exists for ${email}, a reset link is on its way.`}
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
        <AuthHeader title='Reset Password' onBack={() => navigation.goBack()} />

        <GroupedList style={{ marginTop: space['3xl'] }}>
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
            returnKeyType='go'
            onSubmitEditing={handleSubmit}
          />
        </GroupedList>

        {/* The explanatory copy is the group's footer, which is where iOS keeps it — the error
            replaces it in place rather than pushing the layout around. */}
        <GroupedFooter tone={error ? 'danger' : 'secondary'}>
          {error || "Enter the email on your account and we'll send a reset link."}
        </GroupedFooter>

        <AuthButton
          label='Send Reset Link'
          loading={loading}
          onPress={handleSubmit}
          style={{ marginTop: space['2xl'] }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
