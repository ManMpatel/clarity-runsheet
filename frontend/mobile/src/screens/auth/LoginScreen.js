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
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react-native'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Field, Button } from '../../components/ui'

export default function LoginScreen({ navigation }) {
  const { colors, space, radius, type, scheme } = useTheme()
  const insets = useSafeAreaInsets()

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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.canvas }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: insets.top }} keyboardShouldPersistTaps='handled'>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: space.lg, alignSelf: 'flex-start' }}>
          <ChevronLeft size={26} color={colors.fg} />
        </Pressable>

        <View style={{ paddingHorizontal: space['2xl'], flex: 1, justifyContent: 'center', paddingBottom: space['4xl'] }}>
          <Text style={[type.title1, { color: colors.fg }]}>Welcome back</Text>
          <Text style={[type.body, { color: colors.fgMuted, marginTop: space.xs, marginBottom: space['2xl'] }]}>
            Sign in to access your fleet
          </Text>

          <Field
            label='Email address'
            value={email}
            onChangeText={setEmail}
            placeholder='driver@clarityfleet.com.au'
            keyboardType='email-address'
            autoCapitalize='none'
            autoCorrect={false}
          />

          <Field
            label='Password'
            value={password}
            onChangeText={setPassword}
            placeholder='••••••••'
            secureTextEntry={!showPw}
            right={
              <Pressable onPress={() => setShowPw(s => !s)} hitSlop={10}>
                {showPw ? <EyeOff size={18} color={colors.fgMuted} /> : <Eye size={18} color={colors.fgMuted} />}
              </Pressable>
            }
          />

          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ alignSelf: 'flex-end', marginBottom: space.lg }}>
            <Text style={[type.captionMedium, { color: colors.accent }]}>Forgot password?</Text>
          </Pressable>

          <Button label='Sign in' loading={loading} onPress={handleLogin} />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: space.lg }}>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
            <Text style={[type.caption, { color: colors.fgMuted, marginHorizontal: space.md }]}>or</Text>
            <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
          </View>

          {/* Apple's own button component, not a look-alike — App Review checks that Sign in with
              Apple uses the system-provided styling, and it's required (Guideline 4.8) to sit
              alongside Google wherever a third-party login is offered. */}
          {appleAvailable && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={scheme === 'dark'
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={radius.md}
              style={{ height: 52, width: '100%', marginBottom: space.md }}
              onPress={handleAppleLogin}
            />
          )}

          <Button label='Continue with Google' variant='secondary' onPress={handleGoogleLogin} disabled={loading} />

          <Pressable onPress={() => navigation.navigate('Signup')} style={{ flexDirection: 'row', justifyContent: 'center', marginTop: space['2xl'] }}>
            <Text style={[type.body, { color: colors.fgMuted }]}>Don't have an account? </Text>
            <Text style={[type.bodySemibold, { color: colors.accent }]}>Sign up</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
