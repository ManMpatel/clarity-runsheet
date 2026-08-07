import { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

const ROLES = ['companyAdmin', 'fleetManager']

export default function UsersScreen() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'fleetManager' })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/api/settings/users')
      setUsers(res.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  async function addUser() {
    setFormError('')
    if (!form.name || !form.email || !form.password) {
      setFormError('Name, email and password are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/api/settings/users', form)
      setUsers(u => [...u, res.data])
      setForm({ name: '', email: '', password: '', role: 'fleetManager' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not add user')
    } finally {
      setSaving(false)
    }
  }

  function roleLabel(role) {
    if (role === 'companyAdmin') return 'Admin'
    if (role === 'fleetManager') return 'Fleet Manager'
    return role
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load users</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>{users.length} user{users.length === 1 ? '' : 's'}</Text>

      {showAdd && (
        <View style={styles.form}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TextInput style={styles.input} placeholder='Name' value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          <TextInput style={styles.input} placeholder='Email' value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} autoCapitalize='none' keyboardType='email-address' />
          <TextInput style={styles.input} placeholder='Temporary password' value={form.password} onChangeText={t => setForm(f => ({ ...f, password: t }))} secureTextEntry />
          <View style={styles.chipRow}>
            {ROLES.map(r => (
              <TouchableOpacity key={r} style={[styles.chip, form.role === r && styles.chipActive]} onPress={() => setForm(f => ({ ...f, role: r }))}>
                <Text style={[styles.chipText, form.role === r && styles.chipTextActive]}>{roleLabel(r)}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={addUser} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Add user'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={users}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !showAdd && (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>No other users yet</Text>
              <Text style={styles.errorSub}>Tap + to invite your first team member</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.iconBadge}>
              <MaterialIcons name='person' size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.email}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{roleLabel(item.role)}</Text>
            </View>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(!showAdd)}>
        <MaterialIcons name={showAdd ? 'close' : 'add'} size={26} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  countLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: '600', paddingHorizontal: spacing.margin, paddingTop: 16, paddingBottom: 8 },
  form:       { paddingHorizontal: spacing.margin, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  input:      { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8, backgroundColor: colors.surface, color: colors.textPrimary },
  formError:  { color: colors.error, fontSize: 12, marginBottom: 8 },
  chipRow:    { flexDirection: 'row', gap: 8, marginBottom: 10 },
  chip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 12, color: colors.textPrimary },
  chipTextActive: { color: colors.onPrimary },
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText:{ color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  list:       { paddingHorizontal: spacing.margin, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  iconBadge: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  name:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  meta:       { fontSize: 12, color: colors.textSecondary },
  roleBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.background },
  roleText:   { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
})