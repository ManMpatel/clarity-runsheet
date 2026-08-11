import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Users as UsersIcon, Plus, X, UserRound } from 'lucide-react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Chip, Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui'

const ROLES = ['companyAdmin', 'fleetManager']
const roleLabel = (r) => (r === 'companyAdmin' ? 'Admin' : r === 'fleetManager' ? 'Fleet Manager' : r)

export default function UsersScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const canManage = useAuthStore((s) => s.canManage())
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
      const res = await api.get('/settings/users')
      setUsers(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load users')
    } finally {
      setLoading(false)
    }
  }

  async function addUser() {
    setFormError('')
    if (!form.name || !form.email || !form.password) return setFormError('Name, email and password are required')
    setSaving(true)
    try {
      const res = await api.post('/settings/users', form, { headers: { 'Idempotency-Key': `${Date.now()}-${form.email}` } })
      setUsers((u) => [...u, res.data])
      setForm({ name: '', email: '', password: '', role: 'fleetManager' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add user')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Team'
        onBack={() => navigation.goBack()}
        right={canManage ? <Pressable onPress={() => setShowAdd((s) => !s)} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable> : null}
      />
      {canManage && showAdd && (
        <Card style={{ marginHorizontal: space.lg, marginBottom: space.md }}>
          {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
          <Field placeholder='Name' value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
          <Field placeholder='Email' value={form.email} onChangeText={(t) => setForm((f) => ({ ...f, email: t }))} autoCapitalize='none' keyboardType='email-address' />
          <Field placeholder='Temporary password' value={form.password} onChangeText={(t) => setForm((f) => ({ ...f, password: t }))} secureTextEntry />
          <View style={{ flexDirection: 'row', marginBottom: space.md }}>
            {ROLES.map((r) => (
              <Chip key={r} label={roleLabel(r)} active={form.role === r} onPress={() => setForm((f) => ({ ...f, role: r }))} />
            ))}
          </View>
          <Button label='Add user' loading={saving} onPress={addUser} />
        </Card>
      )}

      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={64} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={!showAdd && <EmptyState icon={<UsersIcon size={36} color={colors.fgSubtle} />} title='No other users yet' message={canManage ? 'Tap + to invite your first team member' : 'Ask a company admin to invite team members'} />}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                <UserRound size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodySemibold, { color: colors.fg }]}>{item.name}</Text>
                <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{item.email}</Text>
              </View>
              <Badge label={roleLabel(item.role)} />
            </Card>
          )}
        />
      )}
    </View>
  )
}
