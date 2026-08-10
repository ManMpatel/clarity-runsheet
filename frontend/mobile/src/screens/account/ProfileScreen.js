import { useEffect, useState } from 'react'
import { ScrollView, View, Text, Alert } from 'react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Badge, Skeleton, ErrorState } from '../../components/ui'

export default function ProfileScreen({ navigation }) {
  const { colors, space, type } = useTheme()

  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showPw, setShowPw]   = useState(false)
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [saving, setSaving]   = useState(false)
  const [pwError, setPwError] = useState('')

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
