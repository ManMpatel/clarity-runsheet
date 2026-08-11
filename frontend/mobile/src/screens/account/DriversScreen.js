import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { IdCard, Plus, X, UserRound } from 'lucide-react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, EmptyState, ErrorState, Skeleton } from '../../components/ui'

export default function DriversScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const canManage = useAuthStore((s) => s.canManage())
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState({ name: '', email: '', mobile: '', licenceNumber: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/drivers')
      setDrivers(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load drivers')
    } finally {
      setLoading(false)
    }
  }

  async function addDriver() {
    setFormError('')
    if (!form.name || !form.email || !form.mobile) return setFormError('Name, email and mobile are required')
    setSaving(true)
    try {
      const res = await api.post('/drivers', form, { headers: { 'Idempotency-Key': `${Date.now()}-${form.email}` } })
      setDrivers((d) => [...d, res.data])
      setForm({ name: '', email: '', mobile: '', licenceNumber: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add driver')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Drivers'
        onBack={() => navigation.goBack()}
        right={canManage ? <Pressable onPress={() => setShowAdd((s) => !s)} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable> : null}
      />
      {canManage && showAdd && (
        <Card style={{ marginHorizontal: space.lg, marginBottom: space.md }}>
          {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
          <Field placeholder='Name' value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
          <Field placeholder='Email' value={form.email} onChangeText={(t) => setForm((f) => ({ ...f, email: t }))} autoCapitalize='none' keyboardType='email-address' />
          <Field placeholder='Mobile' value={form.mobile} onChangeText={(t) => setForm((f) => ({ ...f, mobile: t }))} keyboardType='phone-pad' />
          <Field placeholder='Licence number (optional)' value={form.licenceNumber} onChangeText={(t) => setForm((f) => ({ ...f, licenceNumber: t }))} style={{ marginBottom: 0 }} />
          <Button label='Save driver' loading={saving} onPress={addDriver} style={{ marginTop: space.md }} />
        </Card>
      )}

      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={64} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={drivers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={!showAdd && <EmptyState icon={<IdCard size={36} color={colors.fgSubtle} />} title='No drivers yet' message={canManage ? 'Tap + to register your first driver' : 'Ask a company admin to register drivers'} />}
          renderItem={({ item }) => (
            <Card style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                <UserRound size={18} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodySemibold, { color: colors.fg }]}>{item.name}</Text>
                <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{item.mobile}{item.licenceNumber ? ` · Lic ${item.licenceNumber}` : ''}</Text>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  )
}
