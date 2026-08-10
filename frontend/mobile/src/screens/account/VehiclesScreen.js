import { useEffect, useState } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Truck, Plus, X } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui'

export default function VehiclesScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/vehicles')
      setVehicles(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load vehicles')
    } finally {
      setLoading(false)
    }
  }

  async function addVehicle() {
    setFormError('')
    if (!form.name || !form.imei) return setFormError('Name and IMEI are required')
    setSaving(true)
    try {
      const res = await api.post('/vehicles', form, { headers: { 'Idempotency-Key': `${Date.now()}-${form.imei}` } })
      setVehicles((v) => [...v, res.data])
      setForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add vehicle')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(id, name) {
    Alert.alert('Remove vehicle', `Remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteVehicle(id) },
    ])
  }

  async function deleteVehicle(id) {
    try {
      await api.delete(`/vehicles/${id}`)
      setVehicles((v) => v.filter((x) => x.id !== id))
    } catch {
      Alert.alert('Error', 'Could not remove vehicle')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Vehicles'
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={() => setShowAdd((s) => !s)} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable>}
      />
      {showAdd && (
        <Card style={{ marginHorizontal: space.lg, marginBottom: space.md }}>
          {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
          <Field placeholder="Name — John's HiAce" value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
          <Field placeholder='15-digit IMEI' value={form.imei} onChangeText={(t) => setForm((f) => ({ ...f, imei: t }))} keyboardType='number-pad' />
          <Field placeholder='Registration (e.g. ABC123)' value={form.registration} onChangeText={(t) => setForm((f) => ({ ...f, registration: t }))} autoCapitalize='characters' />
          <Field placeholder='Make' value={form.make} onChangeText={(t) => setForm((f) => ({ ...f, make: t }))} />
          <Field placeholder='Model' value={form.model} onChangeText={(t) => setForm((f) => ({ ...f, model: t }))} />
          <Field placeholder='Year' value={form.year} onChangeText={(t) => setForm((f) => ({ ...f, year: t }))} keyboardType='number-pad' style={{ marginBottom: 0 }} />
          <Button label='Save vehicle' loading={saving} onPress={addVehicle} style={{ marginTop: space.md }} />
        </Card>
      )}

      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={72} radius={16} style={{ marginBottom: space.sm }} /><Skeleton height={72} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={vehicles}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={!showAdd && <EmptyState icon={<Truck size={36} color={colors.fgSubtle} />} title='No vehicles yet' message='Tap + to add your first van' />}
          renderItem={({ item }) => (
            <Pressable onLongPress={() => confirmDelete(item.id, item.name)} style={{ marginBottom: space.sm }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                  <Truck size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodySemibold, { color: colors.fg }]}>{item.name}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>
                    {item.registration || '—'} · {item.imei?.slice(0, 4)}…{item.imei?.slice(-4)}
                  </Text>
                </View>
                <Badge label={(item.tier || 'entry').toUpperCase()} tone={item.tier === 'top' ? 'accent' : item.tier === 'mid' ? 'info' : 'neutral'} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}
