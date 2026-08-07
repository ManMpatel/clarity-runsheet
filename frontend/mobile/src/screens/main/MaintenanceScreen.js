import { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

function statusInfo(record) {
  if (record.status === 'completed') return { label: 'Completed', color: colors.placeholder, icon: 'check-circle' }
  if (!record.dueDate) return { label: 'Pending', color: colors.primary, icon: 'schedule' }
  const diff = new Date(record.dueDate) - new Date()
  if (diff < 0) return { label: 'Overdue', color: colors.error, icon: 'warning' }
  if (diff < 7 * 24 * 60 * 60 * 1000) return { label: 'Due this week', color: colors.warning, icon: 'schedule' }
  return { label: 'Upcoming', color: colors.primary, icon: 'event' }
}

export default function MaintenanceScreen() {
  const [records, setRecords]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ vehicleId: '', type: '', dueDate: '', notes: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [mRes, vRes] = await Promise.all([
        api.get('/maintenance'),
        api.get('/vehicles'),
      ])
      setRecords(mRes.data || [])
      setVehicles(vRes.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load maintenance records')
    } finally {
      setLoading(false)
    }
  }

  async function addRecord() {
    setFormError('')
    if (!form.vehicleId || !form.type) {
      setFormError('Vehicle and service type are required')
      return
    }
    setSaving(true)
    try {
      const res = await api.post('/maintenance', form)
      setRecords(r => [res.data, ...r])
      setForm({ vehicleId: '', type: '', dueDate: '', notes: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not add record')
    } finally {
      setSaving(false)
    }
  }

  async function completeRecord(id) {
    try {
      const res = await api.put(`/maintenance/${id}/complete`, {
        completedDate: new Date().toISOString(),
      })
      setRecords(r => r.map(rec => rec.id === id ? res.data : rec))
    } catch (err) {
      console.log(err.message)
    }
  }

  function vehicleName(id) {
    return vehicles.find(v => v.id === id)?.name || 'Vehicle'
  }

  function formatDate(d) {
    if (!d) return 'No date set'
    return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load maintenance</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>{records.length} record{records.length === 1 ? '' : 's'}</Text>

      {showAdd && (
        <View style={styles.form}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Text style={styles.fieldLabel}>Vehicle</Text>
          <View style={styles.chipRow}>
            {vehicles.map(v => (
              <TouchableOpacity
                key={v.id}
                style={[styles.chip, form.vehicleId === v.id && styles.chipActive]}
                onPress={() => setForm(f => ({ ...f, vehicleId: v.id }))}
              >
                <Text style={[styles.chipText, form.vehicleId === v.id && styles.chipTextActive]}>{v.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput style={styles.input} placeholder='Service type (e.g. Oil change)' value={form.type} onChangeText={t => setForm(f => ({ ...f, type: t }))} />
          <TextInput style={styles.input} placeholder='Due date (YYYY-MM-DD, optional)' value={form.dueDate} onChangeText={t => setForm(f => ({ ...f, dueDate: t }))} />
          <TextInput style={styles.input} placeholder='Notes (optional)' value={form.notes} onChangeText={t => setForm(f => ({ ...f, notes: t }))} />
          <TouchableOpacity style={styles.saveBtn} onPress={addRecord} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save record'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !showAdd && (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>No maintenance records yet</Text>
              <Text style={styles.errorSub}>Tap + to schedule your first service</Text>
            </View>
          )
        }
        renderItem={({ item }) => {
          const status = statusInfo(item)
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => item.status === 'pending' && completeRecord(item.id)}
            >
              <View style={[styles.statusIcon, { backgroundColor: status.color + '1A' }]}>
                <MaterialIcons name={status.icon} size={18} color={status.color} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.vehicle}>{vehicleName(item.vehicleId)}</Text>
                <Text style={styles.type}>{item.type}</Text>
                <Text style={styles.date}>{formatDate(item.dueDate)}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: status.color }]}>
                <Text style={styles.badgeText}>{status.label}</Text>
              </View>
            </TouchableOpacity>
          )
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(!showAdd)}>
        <MaterialIcons name={showAdd ? 'close' : 'add'} size={26} color={colors.onPrimary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  countLabel:  { fontSize: 13, color: colors.textSecondary, fontWeight: '600', paddingHorizontal: spacing.margin, paddingTop: 16, paddingBottom: 8 },
  form:        { paddingHorizontal: spacing.margin, paddingVertical: 12, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel:  { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginBottom: 6 },
  chipRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:    { fontSize: 12, color: colors.textPrimary },
  chipTextActive: { color: colors.onPrimary },
  input:       { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 8, backgroundColor: colors.surface, color: colors.textPrimary },
  formError:   { color: colors.error, fontSize: 12, marginBottom: 8 },
  saveBtn:     { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  saveBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  list:        { paddingHorizontal: spacing.margin, paddingBottom: 100 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  statusIcon: {
    width: 36, height: 36, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm,
  },
  rowInfo:    { flex: 1 },
  vehicle:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  type:       { fontSize: 13, color: colors.textPrimary, marginBottom: 2 },
  date:       { fontSize: 12, color: colors.textSecondary },
  badge:      { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.lg },
  badgeText:  { fontSize: 11, color: '#fff', fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
})