import { useState, useEffect } from 'react'
let GoogleSignin = null
let statusCodes  = {}
try {
  const mod = require('@react-native-google-signin/google-signin')
  GoogleSignin = mod.GoogleSignin
  statusCodes  = mod.statusCodes
} catch (e) {
  console.warn('[GoogleSignin] Native module not available in this build')
}
import { View, Text, Pressable, KeyboardAvoidingView, ScrollView, Platform, Alert } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { Eye, EyeOff } from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { AuthButton, AuthHeader, GroupedList, GroupedField, GroupedFooter } from '../../components/auth'

export default function LoginScreen({ navigation }) {
  const { colors, space, appleType, scheme } = useTheme()
  const insets = useSafeInsets()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  // Guards the Apple button: the module only works on iOS 13+, and rendering Apple's native
  // button anywhere it can't actually complete a sign-in is worse than not showing it.
  const [appleAvailable, setAppleAvailable] = useState(false)
  const login       = useAuthStore(s => s.login)
  const googleLogin = useAuthStore(s => s.googleLogin)
  const appleLogin  = useAuthStore(s => s.appleLogin)

  useEffect(() => {
    GoogleSignin?.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID })
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable).catch(() => setAppleAvailable(false))
    }
  }, [])

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter email and password')
      return
    }
    setLoading(true)
    try {
      await login(email.toLowerCase().trim(), password)
    } catch (err) {
      Alert.alert('Login failed', err.response?.data?.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    if (!GoogleSignin) {
      Alert.alert('Not available', 'Google Sign-In requires a new app build. Use email login for now.')
      return
    }
    setLoading(true)
    try {
      await GoogleSignin.hasPlayServices()
      const userInfo = await GoogleSignin.signIn()
      const idToken  = userInfo.data?.idToken
      if (!idToken) throw new Error('No ID token received')
      await googleLogin(idToken)
    } catch (err) {
      if (err.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In failed', err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleAppleLogin() {
    setLoading(true)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('No identity token received')
      // `fullName` is populated ONLY on the first-ever authorisation for this Apple ID + app.
      // Every subsequent sign-in returns null for it, which is why it's forwarded to the server
      // rather than kept client-side — the server persists it the one time it arrives.
      await appleLogin(credential.identityToken, credential.fullName)
    } catch (err) {
      // ERR_REQUEST_CANCELED is the user dismissing the sheet — not an error worth alerting on.
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign-In failed', err.message || 'Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.iosGroupedBg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingHorizontal: space.xl,
          paddingBottom: insets.bottom + space.xl,
        }}
        keyboardShouldPersistTaps='handled'
        showsVerticalScrollIndicator={false}
      >
        <AuthHeader
          title='Sign In'
          subtitle='Sign in to access your fleet'
          onBack={() => navigation.goBack()}
        />

        <View style={{ marginTop: space['3xl'] }}>
          <GroupedList>
            <GroupedField
              label='Email'
              value={email}
              onChangeText={setEmail}
              placeholder='you@company.com.au'
              keyboardType='email-address'
              autoCapitalize='none'
              autoCorrect={false}
              textContentType='username'
              autoComplete='email'
              returnKeyType='next'
            />
            <GroupedField
              label='Password'
              value={password}
              onChangeText={setPassword}
              placeholder='Required'
              secureTextEntry={!showPw}
              autoCapitalize='none'
              autoCorrect={false}
              textContentType='password'
              autoComplete='current-password'
              returnKeyType='go'
              onSubmitEditing={handleLogin}
              right={
                <Pressable
                  onPress={() => setShowPw(s => !s)}
                  hitSlop={12}
                  accessibilityRole='button'
                  accessibilityLabel={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw
                    ? <EyeOff size={20} color={colors.iosLabelSecondary} />
                    : <Eye size={20} color={colors.iosLabelSecondary} />}
                </Pressable>
              }
            />
          </GroupedList>

          {/* Apple puts links and hints in the footer below a group, not inside it. */}
          <Pressable
            onPress={() => navigation.navigate('ForgotPassword')}
            hitSlop={8}
            style={({ pressed }) => ({ alignSelf: 'flex-start', opacity: pressed ? 0.4 : 1 })}
          >
            <GroupedFooter style={{ color: colors.accentFg }}>Forgot Password?</GroupedFooter>
          </Pressable>
        </View>

        <AuthButton
          label='Sign In'
          loading={loading}
          onPress={handleLogin}
          style={{ marginTop: space['2xl'] }}
        />

        {/* No "or" divider — iOS separates these with whitespace rather than a rule. */}
        <View style={{ marginTop: space['2xl'] }}>
          {/* Apple's own button component, not a look-alike — App Review checks that Sign in with
              Apple uses the system-provided styling, and it's required (Guideline 4.8) to sit
              alongside Google wherever a third-party login is offered. Height and cornerRadius are
              the only geometry it exposes, so AuthButton is sized to match it rather than the
              reverse. */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={{ height: 50, width: '100%', marginBottom: space.md }}
              onPress={handleAppleLogin}
            />
          )}

          <AuthButton
            variant='tinted'
            label='Continue with Google'
            onPress={handleGoogleLogin}
            disabled={loading}
          />
        </View>

        {/* Grows to push the sign-up link to the bottom on tall devices, collapses on short ones. */}
        <View style={{ flex: 1, minHeight: space['3xl'] }} />

        <Pressable
          onPress={() => navigation.navigate('Signup')}
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: pressed ? 0.4 : 1,
          })}
        >
          <Text style={[appleType.footnote, { color: colors.iosLabelSecondary }]}>
            Don't have an account?{' '}
          </Text>
          <Text style={[appleType.footnoteEmphasized, { color: colors.accentFg }]}>Sign Up</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
