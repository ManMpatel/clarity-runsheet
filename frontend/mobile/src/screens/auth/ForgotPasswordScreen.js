import { useState } from 'react'
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft, MailCheck } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Field, Button } from '../../components/ui'

// New — the old app just Linking.openURL'd to the web dashboard's /forgot-password page. The
// backend endpoint (POST /auth/forgot-password) was always mobile-reachable, just never wired up
// from a mobile screen.
export default function ForgotPasswordScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeAreaInsets()

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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: space.lg, marginTop: insets.top, alignSelf: 'flex-start' }}>
        <ChevronLeft size={26} color={colors.fg} />
      </Pressable>

      <View style={{ flex: 1, paddingHorizontal: space['2xl'], justifyContent: 'center' }}>
        {sent ? (
          <View style={{ alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg }}>
              <MailCheck size={28} color={colors.accent} />
            </View>
            <Text style={[type.title2, { color: colors.fg, textAlign: 'center' }]}>Check your inbox</Text>
            <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space.xs }]}>
              If an account exists for {email}, a reset link is on its way.
            </Text>
          </View>
        ) : (
          <>
            <Text style={[type.title1, { color: colors.fg }]}>Reset your password</Text>
            <Text style={[type.body, { color: colors.fgMuted, marginTop: space.xs, marginBottom: space['2xl'] }]}>
              Enter the email on your account and we'll send a reset link.
            </Text>
            <Field
              label='Email address'
              value={email}
              onChangeText={setEmail}
              placeholder='driver@clarityfleet.com.au'
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
              error={error}
            />
            <Button label='Send reset link' loading={loading} onPress={handleSubmit} />
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}
