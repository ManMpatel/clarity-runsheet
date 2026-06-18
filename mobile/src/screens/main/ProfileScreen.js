import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

export default function ProfileScreen() {
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
      const res = await api.get('/api/auth/me')
      setUser(res.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load profile')
    } finally {
      setLoading(false)
    }
  }

  async function savePassword() {
    setPwError('')
    if (!pwForm.next || !pwForm.confirm) {
      setPwError('Fill in both new password fields')
      return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      await api.put('/api/auth/password', { currentPassword: pwForm.current, newPassword: pwForm.next })
      setShowPw(false)
      setPwForm({ current: '', next: '', confirm: '' })
      Alert.alert('Password updated')
    } catch (err) {
      setPwError(err.response?.data?.error || 'Could not update password')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load profile</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.sub}>Profile Details</Text>
      </View>

      <Text style={styles.sectionTitle}>Personal Information</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>FULL NAME</Text>
          <Text style={styles.rowValue}>{user?.name}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>EMAIL ADDRESS</Text>
          <View style={styles.emailRow}>
            <Text style={styles.rowValue}>{user?.email}</Text>
            {user?.emailVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name='check-circle' size={12} color='#15803d' />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>ROLE</Text>
          <Text style={styles.rowValue}>{user?.role}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>MEMBER SINCE</Text>
          <Text style={styles.rowValue}>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-AU') : '--'}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Security</Text>
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.rowLabel}>PASSWORD</Text>
          <TouchableOpacity onPress={() => setShowPw(!showPw)}>
            <Text style={styles.changeLink}>{showPw ? 'Cancel' : 'Change password'}</Text>
          </TouchableOpacity>
        </View>

        {showPw && (
          <View style={styles.pwForm}>
            {pwError ? <Text style={styles.error}>{pwError}</Text> : null}
            <TextInput style={styles.input} placeholder='Current password' placeholderTextColor={colors.placeholder} secureTextEntry value={pwForm.current} onChangeText={t => setPwForm(f => ({ ...f, current: t }))} />
            <TextInput style={styles.input} placeholder='New password' placeholderTextColor={colors.placeholder} secureTextEntry value={pwForm.next} onChangeText={t => setPwForm(f => ({ ...f, next: t }))} />
            <TextInput style={styles.input} placeholder='Confirm new password' placeholderTextColor={colors.placeholder} secureTextEntry value={pwForm.confirm} onChangeText={t => setPwForm(f => ({ ...f, confirm: t }))} />
            <TouchableOpacity style={styles.saveBtn} onPress={savePassword} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Update password'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.margin, paddingBottom: spacing.lg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: spacing.lg },
  avatar:     { width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { color: colors.onPrimary, fontSize: 24, fontWeight: '700' },
  name:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  sub:        { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  row:      { padding: spacing.md },
  rowBetween: { padding: spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  rowValue: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  emailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.lg },
  verifiedText: { fontSize: 11, color: '#15803d', fontWeight: '600' },
  divider:  { height: 1, backgroundColor: colors.border },
  changeLink: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  pwForm: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  input:  { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 14, color: colors.textPrimary, marginBottom: 8, backgroundColor: colors.surface },
  error:  { color: colors.error, fontSize: 12, marginBottom: 8 },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
})