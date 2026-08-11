import { useEffect, useState } from 'react'
import { View, Text, Pressable, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { MapPin, Plus, X } from 'lucide-react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Switch, StatusDot, EmptyState, ErrorState, Skeleton } from '../../components/ui'

// Circle-as-polygon generator, unchanged from the original screen (and matches web's
// GeofenceManager.jsx generateCirclePolygon) — 111320 m/deg equirectangular approximation.
function generateCirclePolygon(lng, lat, radiusMetres, points = 64) {
  const coords = []
  for (let i = 0; i < points; i++) {
    const angle = (i / points) * 2 * Math.PI
    const dx = (radiusMetres / 111320) * Math.cos(angle)
    const dy = (radiusMetres / (111320 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle)
    coords.push([lng + dy, lat + dx])
  }
  coords.push(coords[0])
  return { type: 'Polygon', coordinates: [coords] }
}

function radiusLabel(metres) {
  if (!metres) return '?'
  return metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${metres} m`
}

export default function GeofenceScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  // Creating a zone allows fleetManager; DELETE /geofences/:id is companyAdmin-only, so only the
  // long-press-to-delete affordance is gated here (see backend/.../routes/geofences.ts).
  const canDelete = useAuthStore((s) => s.canManage())
  const [zones, setZones]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState({ name: '', lat: '', lng: '', radiusMetres: '500', alertOnEntry: false, alertOnExit: true })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/geofences')
      setZones(res.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load geofences')
    } finally {
      setLoading(false)
    }
  }

  async function addZone() {
    setFormError('')
    const lat = parseFloat(form.lat), lng = parseFloat(form.lng), radiusMetres = parseInt(form.radiusMetres, 10)
    if (!form.name || isNaN(lat) || isNaN(lng) || isNaN(radiusMetres)) return setFormError('Name, latitude, longitude and radius are required')
    setSaving(true)
    try {
      const geometry = generateCirclePolygon(lng, lat, radiusMetres)
      const res = await api.post('/geofences', {
        name: form.name, geometry, centre: { lat, lng }, radiusMetres,
        alertOnEntry: form.alertOnEntry, alertOnExit: form.alertOnExit,
      }, { headers: { 'Idempotency-Key': `${Date.now()}-${form.name}` } })
      setZones((z) => [res.data, ...z])
      setForm({ name: '', lat: '', lng: '', radiusMetres: '500', alertOnEntry: false, alertOnExit: true })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not create zone')
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
      await api.delete(`/geofences/${id}`)
      setZones((z) => z.filter((zone) => zone.id !== id))
    } catch {
      Alert.alert('Error', 'Could not delete zone')
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Geofence Manager'
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={() => setShowAdd((s) => !s)} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable>}
      />
      {showAdd && (
        <Card style={{ marginHorizontal: space.lg, marginBottom: space.md }}>
          {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
          <Field placeholder='Zone name (e.g. Depot)' value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
          <View style={{ flexDirection: 'row' }}>
            <Field placeholder='Latitude' value={form.lat} onChangeText={(t) => setForm((f) => ({ ...f, lat: t }))} keyboardType='numbers-and-punctuation' style={{ flex: 1, marginRight: space.sm }} />
            <Field placeholder='Longitude' value={form.lng} onChangeText={(t) => setForm((f) => ({ ...f, lng: t }))} keyboardType='numbers-and-punctuation' style={{ flex: 1 }} />
          </View>
          <Text style={[type.caption, { color: colors.fgSubtle, marginTop: -space.sm, marginBottom: space.md }]}>
            Tip: open the Map tab, tap a vehicle, and use its coordinates as a starting point
          </Text>
          <Field placeholder='Radius in metres (e.g. 500)' value={form.radiusMetres} onChangeText={(t) => setForm((f) => ({ ...f, radiusMetres: t }))} keyboardType='number-pad' />
          <Row label='Alert on entry'>
            <Switch value={form.alertOnEntry} onValueChange={(v) => setForm((f) => ({ ...f, alertOnEntry: v }))} />
          </Row>
          <Row label='Alert on exit' last>
            <Switch value={form.alertOnExit} onValueChange={(v) => setForm((f) => ({ ...f, alertOnExit: v }))} />
          </Row>
          <Button label='Save zone' loading={saving} onPress={addZone} style={{ marginTop: space.md }} />
        </Card>
      )}

      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={72} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={zones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={!showAdd && <EmptyState icon={<MapPin size={36} color={colors.fgSubtle} />} title='No zones yet' message='Tap + to create your first zone' />}
          renderItem={({ item }) => (
            <Pressable onLongPress={canDelete ? () => confirmDelete(item.id, item.name) : undefined} style={{ marginBottom: space.sm }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                  <MapPin size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodySemibold, { color: colors.fg }]}>{item.name}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>
                    {radiusLabel(item.radiusMetres)} radius{item.alertOnEntry ? ' · Entry' : ''}{item.alertOnExit ? ' · Exit' : ''}
                  </Text>
                </View>
                <StatusDot status={item.active ? 'moving' : 'stopped'} />
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  )
}

function Row({ label, children, last }) {
  const { colors, space, type } = useTheme()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.xs, marginBottom: last ? 0 : space.xs }}>
      <Text style={[type.bodyMedium, { color: colors.fg }]}>{label}</Text>
      {children}
    </View>
  )
}
