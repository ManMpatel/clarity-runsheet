import { useEffect, useState } from 'react'
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Switch, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

function generateCirclePolygon(lng, lat, radiusMetres, points = 64) {
  const coords = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = (radiusMetres / 111320) * Math.cos(angle)
    const dy = (radiusMetres / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(angle)
    coords.push([lng + dy, lat + dx])
  }
  coords.push(coords[0])
  return { type: 'Polygon', coordinates: [coords] }
}

export default function GeofenceScreen() {
  const [zones, setZones]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({
    name: '', lat: '', lng: '', radiusMetres: '500',
    alertOnEntry: false, alertOnExit: true,
  })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/api/geofences')
      setZones(res.data || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load geofences')
    } finally {
      setLoading(false)
    }
  }

  async function addZone() {
    setFormError('')
    const lat = parseFloat(form.lat)
    const lng = parseFloat(form.lng)
    const radiusMetres = parseInt(form.radiusMetres)
    if (!form.name || isNaN(lat) || isNaN(lng) || isNaN(radiusMetres)) {
      setFormError('Name, latitude, longitude and radius are required')
      return
    }
    setSaving(true)
    try {
      const geometry = generateCirclePolygon(lng, lat, radiusMetres)
      const res = await api.post('/api/geofences', {
        name: form.name,
        geometry,
        centre: { lat, lng },
        radiusMetres,
        alertOnEntry: form.alertOnEntry,
        alertOnExit: form.alertOnExit,
      })
      setZones(z => [res.data, ...z])
      setForm({ name: '', lat: '', lng: '', radiusMetres: '500', alertOnEntry: false, alertOnExit: true })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create zone')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(id, name) {
    Alert.alert('Delete zone', `Delete ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteZone(id) },
    ])
  }

  async function deleteZone(id) {
    try {
      await api.delete(`/api/geofences/${id}`)
      setZones(z => z.filter(zone => zone._id !== id))
    } catch (err) {
      Alert.alert('Error', 'Could not delete zone')
    }
  }

  function radiusLabel(metres) {
    if (!metres) return '?'
    return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load geofences</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.countLabel}>{zones.length} zone{zones.length === 1 ? '' : 's'}</Text>

      {showAdd && (
        <View style={styles.form}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <TextInput style={styles.input} placeholder='Zone name (e.g. Depot)' value={form.name} onChangeText={t => setForm(f => ({ ...f, name: t }))} />
          <View style={styles.coordRow}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder='Latitude' value={form.lat} onChangeText={t => setForm(f => ({ ...f, lat: t }))} keyboardType='numbers-and-punctuation' />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder='Longitude' value={form.lng} onChangeText={t => setForm(f => ({ ...f, lng: t }))} keyboardType='numbers-and-punctuation' />
          </View>
          <Text style={styles.hint}>Tip: open the Map tab, tap a vehicle, and use its coordinates as a starting point</Text>
          <TextInput style={styles.input} placeholder='Radius in metres (e.g. 500)' value={form.radiusMetres} onChangeText={t => setForm(f => ({ ...f, radiusMetres: t }))} keyboardType='number-pad' />

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Alert on entry</Text>
            <Switch value={form.alertOnEntry} onValueChange={v => setForm(f => ({ ...f, alertOnEntry: v }))} trackColor={{ false: '#d1d5db', true: colors.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Alert on exit</Text>
            <Switch value={form.alertOnExit} onValueChange={v => setForm(f => ({ ...f, alertOnExit: v }))} trackColor={{ false: '#d1d5db', true: colors.primary }} />
          </View>

          <TouchableOpacity style={styles.saveBtn} onPress={addZone} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save zone'}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={zones}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !showAdd && (
            <View style={styles.center}>
              <MaterialIcons name='location-on' size={40} color={colors.placeholder} />
              <Text style={styles.errorTitle}>No zones yet</Text>
              <Text style={styles.errorSub}>Tap + to create your first zone</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onLongPress={() => confirmDelete(item._id, item.name)}>
            <View style={styles.iconBadge}>
              <MaterialIcons name='location-on' size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {radiusLabel(item.radiusMetres)} radius
                {item.alertOnEntry ? ' · Entry' : ''}
                {item.alertOnExit ? ' · Exit' : ''}
              </Text>
            </View>
            <View style={[styles.dot, { backgroundColor: item.active ? colors.success : colors.placeholder }]} />
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
  coordRow:   { flexDirection: 'row', gap: 8 },
  hint:       { fontSize: 11, color: colors.textSecondary, marginBottom: 8, fontStyle: 'italic' },
  formError:  { color: colors.error, fontSize: 12, marginBottom: 8 },
  toggleRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  toggleLabel:{ fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  saveBtn:    { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
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
  dot:        { width: 8, height: 8, borderRadius: 4 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginTop: 8, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  fab: {
    position: 'absolute', right: 20, bottom: 20,
    width: 56, height: 56, borderRadius: radius.lg,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
})