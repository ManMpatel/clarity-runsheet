import { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

export default function DriversScreen() {
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
      const res = await api.get('/api/drivers')
      setDrivers(res.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load drivers')
    } finally {
      setLoading(false)
    }
  }

  async function addDriver() {
    setFormError('')
    if (!form.name || !form.email || !form.mobile) {
      setFormError('Name, email and mobile are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/api/drivers', form)
      setDrivers(d => [...d, res.data])
      setForm({ name: '', email: '', mobile: '', licenceNumber: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not add driver')
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
        <Text style={styles.errorTitle}>Couldn't load drivers</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>{drivers.length} driver{drivers.length === 1 ? '' : 's'}</Text>

      {showAdd && (
        <View style={styles.form}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TextInput style={styles.input} placeholder='Name' value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          <TextInput style={styles.input} placeholder='Email' value={form.email} onChangeText={t => setForm(f => ({ ...f, email: t }))} autoCapitalize='none' keyboardType='email-address' />
          <TextInput style={styles.input} placeholder='Mobile' value={form.mobile} onChangeText={t => setForm(f => ({ ...f, mobile: t }))} keyboardType='phone-pad' />
          <TextInput style={styles.input} placeholder='Licence number (optional)' value={form.licenceNumber} onChangeText={t => setForm(f => ({ ...f, licenceNumber: t }))} />
          <TouchableOpacity style={styles.saveBtn} onPress={addDriver} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save driver'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={drivers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !showAdd && (
            <View style={styles.center}>
              <MaterialIcons name='person-off' size={40} color={colors.placeholder} />
              <Text style={styles.errorTitle}>No drivers yet</Text>
              <Text style={styles.errorSub}>Tap + to register your first driver</Text>
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
              <Text style={styles.meta}>{item.mobile}{item.licenceNumber ? ` · Lic ${item.licenceNumber}` : ''}</Text>
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
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText:{ color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  list:       { paddingHorizontal: spacing.margin, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  iconBadge: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing.sm,
  },
  name:       { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  meta:       { fontSize: 12, color: colors.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 12, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
})