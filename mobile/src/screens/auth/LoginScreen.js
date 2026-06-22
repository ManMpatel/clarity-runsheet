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
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert, Linking
} from 'react-native'
import { useAuthStore } from '../../stores/authStore'
import { colors, radius, spacing } from '../../lib/theme'

export default function LoginScreen({ navigation }) {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [loading, setLoading]   = useState(false)
  const login       = useAuthStore(s => s.login)
  const googleLogin = useAuthStore(s => s.googleLogin)

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    })
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
      Alert.alert('Login failed', err.response?.data?.error || 'Something went wrong')
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

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>CF</Text>
          </View>
          <Text style={styles.title}>Sign In</Text>
          <Text style={styles.subtitle}>Access your fleet dashboard</Text>
        </View>

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder='driver@clarityfleet.com.au'
          placeholderTextColor={colors.placeholder}
          keyboardType='email-address'
          autoCapitalize='none'
          autoCorrect={false}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={styles.passwordInput}
            value={password}
            onChangeText={setPassword}
            placeholder='••••••••'
            placeholderTextColor={colors.placeholder}
            secureTextEntry={!showPw}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
            <Text style={styles.eyeText}>{showPw ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotLink}
          onPress={() => Linking.openURL('https://track.clarity-software.com.au/forgot-password')}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign in'}</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={handleGoogleLogin}
          disabled={loading}
        >
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signupRow}
          onPress={() => navigation.navigate('Signup')}
        >
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Text style={styles.signupLink}>Sign up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.margin,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoBadgeText: {
    color: colors.onPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginBottom: 4,
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.textPrimary,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  eyeText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  forgotLink: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  forgotText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
  btn: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  signupRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: colors.textSecondary },
  googleBtn: {
    height: 56, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md, backgroundColor: colors.surface,
  },
  googleBtnText: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
})