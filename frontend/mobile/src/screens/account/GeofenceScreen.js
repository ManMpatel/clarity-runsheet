import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, Alert, Platform, StyleSheet, ScrollView } from 'react-native'
import MapView, { Circle, Marker } from 'react-native-maps'
import { FlashList } from '@shopify/flash-list'
import { MapPin, Plus, X } from 'lucide-react-native'
import api from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { useTheme } from '../../theme'
import { mapStyleLight, mapStyleDark } from '../../lib/mapStyle'
import { Header, Card, Field, Button, Switch, StatusDot, EmptyState, ErrorState, Skeleton } from '../../components/ui'

const SYDNEY = { latitude: -33.8688, longitude: 151.2093, latitudeDelta: 0.08, longitudeDelta: 0.08 }

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

const EMPTY_FORM = { name: '', lat: null, lng: null, radiusMetres: '500', alertOnEntry: false, alertOnExit: true }

export default function GeofenceScreen({ navigation }) {
  const { colors, space, radius, type, scheme } = useTheme()
  // Creating a zone allows fleetManager; DELETE /geofences/:id is companyAdmin-only, so only the
  // long-press-to-delete affordance is gated here (see backend/.../routes/geofences.ts).
  const canDelete = useAuthStore((s) => s.canManage())
  const [zones, setZones]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const mapRef = useRef(null)

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

  const centre = useMemo(() => {
    if (form.lat == null || form.lng == null) return null
    return { latitude: form.lat, longitude: form.lng }
  }, [form.lat, form.lng])

  const radiusMetres = parseInt(form.radiusMetres, 10)

  function handleMapPress(e) {
    const { latitude, longitude } = e.nativeEvent.coordinate
    setForm((f) => ({ ...f, lat: latitude, lng: longitude }))
    setFormError('')
  }

  async function addZone() {
    setFormError('')
    const lat = form.lat
    const lng = form.lng
    if (!form.name.trim() || lat == null || lng == null || isNaN(radiusMetres) || radiusMetres <= 0) {
      return setFormError('Name, a map pin and a radius are required')
    }
    setSaving(true)
    try {
      const geometry = generateCirclePolygon(lng, lat, radiusMetres)
      const res = await api.post('/geofences', {
        name: form.name.trim(), geometry, centre: { lat, lng }, radiusMetres,
        alertOnEntry: form.alertOnEntry, alertOnExit: form.alertOnExit,
      }, { headers: { 'Idempotency-Key': `${Date.now()}-${form.name}` } })
      setZones((z) => [res.data, ...z])
      setForm(EMPTY_FORM)
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

  function toggleAdd() {
    setShowAdd((s) => !s)
    setFormError('')
    setForm(EMPTY_FORM)
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Geofence Manager'
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={toggleAdd} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable>}
      />

      {showAdd ? (
        <View style={{ flex: 1 }}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialRegion={SYDNEY}
            {...(Platform.OS === 'android'
              ? { customMapStyle: scheme === 'dark' ? mapStyleDark : mapStyleLight }
              : { mapType: scheme === 'dark' ? 'standard' : 'mutedStandard' })}
            onPress={handleMapPress}
          >
            {centre && !isNaN(radiusMetres) && radiusMetres > 0 && (
              <Circle
                center={centre}
                radius={radiusMetres}
                strokeColor={colors.accent}
                fillColor={colors.accent + '33'}
                strokeWidth={2}
              />
            )}
            {centre && <Marker coordinate={centre} />}
          </MapView>

          <View style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, maxHeight: '52%' }}>
            <Card>
              <ScrollView keyboardShouldPersistTaps='handled'>
                <Text style={[type.caption, { color: colors.fgMuted, marginBottom: space.md }]}>
                  Tap the map to place the zone centre
                </Text>
                {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
                <Field placeholder='Zone name (e.g. Depot)' value={form.name} onChangeText={(t) => setForm((f) => ({ ...f, name: t }))} />
                <Field
                  placeholder='Radius in metres (e.g. 500)'
                  value={form.radiusMetres}
                  onChangeText={(t) => setForm((f) => ({ ...f, radiusMetres: t }))}
                  keyboardType='number-pad'
                />
                <Row label='Alert on entry'>
                  <Switch value={form.alertOnEntry} onValueChange={(v) => setForm((f) => ({ ...f, alertOnEntry: v }))} />
                </Row>
                <Row label='Alert on exit' last>
                  <Switch value={form.alertOnExit} onValueChange={(v) => setForm((f) => ({ ...f, alertOnExit: v }))} />
                </Row>
                <Button label='Save zone' loading={saving} onPress={addZone} style={{ marginTop: space.md }} />
              </ScrollView>
            </Card>
          </View>
        </View>
      ) : loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={72} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={zones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={<EmptyState icon={<MapPin size={36} color={colors.fgSubtle} />} title='No zones yet' message='Tap + to create your first zone' />}
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
