import { useEffect, useState } from 'react'
import { ScrollView, View, Text, Alert } from 'react-native'
import { Trash2 } from 'lucide-react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Badge, Skeleton, ErrorState } from '../../components/ui'

export default function ProfileScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const logout = useAuthStore((s) => s.logout)

  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showPw, setShowPw]   = useState(false)
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [pwError, setPwError] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deletePw, setDeletePw]     = useState('')
  const [deleting, setDeleting]     = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/auth/me')
      setUser(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load profile')
    } finally {
      setLoading(false)
    }
  }

  async function savePassword() {
    setPwError('')
    if (!pwForm.next || !pwForm.confirm) return setPwError('Fill in both new password fields')
    if (pwForm.next !== pwForm.confirm) return setPwError('Passwords do not match')
    setSaving(true)
    try {
      await api.put('/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setShowPw(false)
      setPwForm({ current: '', next: '', confirm: '' })
      Alert.alert('Password updated')
    } catch (err) {
      setPwError(err.response?.data?.message || 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  // Two-step on purpose: expanding the panel is step one, the native alert is step two. This is
  // irreversible and, for a sole-user company, takes the entire fleet's history with it — so the
  // confirmation spells out which of the two outcomes applies to this user.
  function confirmDelete() {
    // `hasPassword` is false for Google/Apple-only accounts, which have nothing to type — the
    // backend skips its password check for exactly those, so don't demand one here either.
    if (user?.hasPassword && !deletePw) {
      setDeleteError('Enter your password to confirm')
      return
    }
    Alert.alert(
      'Delete account?',
      'This cannot be undone. If you are the only person on your company account, all vehicles, trips, and tracking history will be permanently deleted too.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: runDelete },
      ]
    )
  }

  async function runDelete() {
    setDeleteError('')
    setDeleting(true)
    try {
      await api.delete('/auth/me', { data: { password: deletePw || undefined } })
      // Clears the stored refresh token and user, which bounces back to the auth stack.
      await logout()
    } catch (err) {
      setDeleteError(err.response?.data?.message || 'Could not delete account')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Profile' onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={200} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}>
          <Text style={[type.captionMedium, { color: colors.fgSubtle, textTransform: 'uppercase', marginBottom: space.sm }]}>Personal information</Text>
          <Card padded={false} style={{ marginBottom: space.xl }}>
            <InfoRow label='Full name' value={user?.name} />
            <Divider />
            <InfoRow label='Email address' value={user?.email} extra={user?.emailVerified && <Badge label='Verified' tone='success' />} />
            <Divider />
            <InfoRow label='Role' value={user?.role} />
            <Divider />
            <InfoRow label='Member since' value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-AU') : '—'} last />
          </Card>

          <Text style={[type.captionMedium, { color: colors.fgSubtle, textTransform: 'uppercase', marginBottom: space.sm }]}>Security</Text>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[type.bodyMedium, { color: colors.fg }]}>Password</Text>
              <Text onPress={() => setShowPw((s) => !s)} style={[type.captionMedium, { color: colors.accent }]}>
                {showPw ? 'Cancel' : 'Change password'}
              </Text>
            </View>
            {showPw && (
              <View style={{ marginTop: space.md }}>
                {!!pwError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{pwError}</Text>}
                <Field placeholder='Current password' secureTextEntry value={pwForm.current} onChangeText={(t) => setPwForm((f) => ({ ...f, current: t }))} />
                <Field placeholder='New password' secureTextEntry value={pwForm.next} onChangeText={(t) => setPwForm((f) => ({ ...f, next: t }))} />
                <Field placeholder='Confirm new password' secureTextEntry value={pwForm.confirm} onChangeText={(t) => setPwForm((f) => ({ ...f, confirm: t }))} style={{ marginBottom: 0 }} />
                <Button label='Update password' onPress={savePassword} loading={saving} style={{ marginTop: space.md }} />
              </View>
            )}
          </Card>

          {/* Required by App Store Guideline 5.1.1(v) — an app that creates accounts in-app must
              let users delete them in-app. Deliberately last on the screen and behind a
              disclosure + a native confirm, since for a sole-user company this wipes the whole
              fleet's history. */}
          <Text style={[type.captionMedium, { color: colors.fgSubtle, textTransform: 'uppercase', marginTop: space.xl, marginBottom: space.sm }]}>Danger zone</Text>
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[type.bodyMedium, { color: colors.fg }]}>Delete account</Text>
              <Text
                onPress={() => { setShowDelete((s) => !s); setDeleteError(''); setDeletePw('') }}
                style={[type.captionMedium, { color: showDelete ? colors.accent : colors.danger }]}
              >
                {showDelete ? 'Cancel' : 'Delete'}
              </Text>
            </View>
            {showDelete && (
              <View style={{ marginTop: space.md }}>
                <View style={{ backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.md, marginBottom: space.md, flexDirection: 'row' }}>
                  <Trash2 size={16} color={colors.dangerFg} style={{ marginTop: 2 }} />
                  <Text style={[type.caption, { color: colors.dangerFg, marginLeft: space.sm, flex: 1, lineHeight: 18 }]}>
                    Permanently deletes your account. If you're the only person on your company
                    account, every vehicle, trip, and piece of tracking history goes with it. This
                    can't be undone.
                  </Text>
                </View>
                {!!deleteError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{deleteError}</Text>}
                {user?.hasPassword && (
                  <Field
                    placeholder='Confirm your password'
                    secureTextEntry
                    value={deletePw}
                    onChangeText={setDeletePw}
                    autoCapitalize='none'
                    style={{ marginBottom: space.md }}
                  />
                )}
                <Button label='Delete my account' variant='danger' loading={deleting} onPress={confirmDelete} />
              </View>
            )}
          </Card>
        </ScrollView>
      )}
    </View>
  )
}

function InfoRow({ label, value, extra, last }) {
  const { space, type, colors } = useTheme()
  return (
    <View style={{ padding: space.md }}>
      <Text style={[type.micro, { color: colors.fgSubtle, marginBottom: 4, textTransform: 'uppercase' }]}>{label}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[type.bodyMedium, { color: colors.fg }]}>{value || '—'}</Text>
        {extra}
      </View>
    </View>
  )
}

function Divider() {
  const { colors } = useTheme()
  return <View style={{ height: 1, backgroundColor: colors.border }} />
}
