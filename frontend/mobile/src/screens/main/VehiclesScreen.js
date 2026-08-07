import { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

export default function VehiclesScreen() {
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
      setError(err.response?.data?.error || 'Could not load vehicles')
    } finally {
      setLoading(false)
    }
  }

  async function addVehicle() {
    setFormError('')
    if (!form.name || !form.imei) {
      setFormError('Name and IMEI are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/vehicles', form)
      setVehicles(v => [...v, res.data])
      setForm({ name: '', imei: '', registration: '', make: '', model: '', year: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not add vehicle')
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
      setVehicles(v => v.filter(x => x.id !== id))
    } catch (err) {
      Alert.alert('Error', 'Could not remove vehicle')
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load vehicles</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>{vehicles.length} registered</Text>

      {showAdd && (
        <View style={styles.form}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TextInput style={styles.input} placeholder="Name — John's HiAce" value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          <TextInput style={styles.input} placeholder='15-digit IMEI' value={form.imei} onChangeText={t => setForm(f => ({ ...f, imei: t }))} keyboardType='number-pad' />
          <TextInput style={styles.input} placeholder='Registration (e.g. ABC123)' value={form.registration} onChangeText={t => setForm(f => ({ ...f, registration: t }))} autoCapitalize='characters' />
          <TextInput style={styles.input} placeholder='Make (e.g. Toyota)' value={form.make} onChangeText={t => setForm(f => ({ ...f, make: t }))} />
          <TextInput style={styles.input} placeholder='Model (e.g. HiAce)' value={form.model} onChangeText={t => setForm(f => ({ ...f, model: t }))} />
          <TextInput style={styles.input} placeholder='Year (e.g. 2022)' value={form.year} onChangeText={t => setForm(f => ({ ...f, year: t }))} keyboardType='number-pad' />
          <TouchableOpacity style={styles.saveBtn} onPress={addVehicle} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save vehicle'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={vehicles}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !showAdd && (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>No vehicles yet</Text>
              <Text style={styles.errorSub}>Tap + to add your first van</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onLongPress={() => confirmDelete(item.id, item.name)}>
            <View style={styles.iconBadge}>
              <MaterialIcons name='local-shipping' size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {item.registration || '—'} · {item.imei?.slice(0, 4)}...{item.imei?.slice(-4)}
              </Text>
            </View>
            <View style={[styles.tierBadge, item.tier === 'top' && styles.tierTop, item.tier === 'mid' && styles.tierMid]}>
              <Text style={styles.tierText}>{(item.tier || 'entry').toUpperCase()}</Text>
            </View>
          </TouchableOpacity>
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
  tierBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: colors.background },
  tierMid:    { backgroundColor: '#dbeafe' },
  tierTop:    { backgroundColor: '#ede9fe' },
  tierText:   { fontSize: 10, fontWeight: '700', color: colors.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
})