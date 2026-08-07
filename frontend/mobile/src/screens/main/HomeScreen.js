import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { WebView } from 'react-native-webview'
import api from '../../lib/api'
import { buildMapHtml } from '../../lib/mapHtml'
import { colors, radius, spacing } from '../../lib/theme'
import VehicleCard from '../../components/VehicleCard'
import TopBar from '../../components/TopBar'
import { useSocket } from '../../hooks/useSocket'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN

export default function HomeScreen() {
  const [vehicles, setVehicles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selected, setSelected]         = useState(null)
  const [secondsAgo, setSecondsAgo]     = useState(0)
  const [activeFilter, setActiveFilter] = useState('all')

  useEffect(() => {
    load()
    const interval = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Live updates: the initial load() below is a one-shot snapshot — after that, position/status
  // changes arrive over the `van:update` socket event (see backend/src/socket/index.ts) and get
  // merged into `vehicles` in place, resetting the "Updated N sec ago" staleness pill each time.
  useSocket(handleVanUpdate)

  function handleVanUpdate(data) {
    setVehicles(prev => {
      let matched = false
      const next = prev.map(v => {
        if (v.id !== data.vehicleId && v.imei !== data.imei) return v
        matched = true
        return {
          ...v,
          latitude:        data.latitude ?? v.latitude,
          longitude:       data.longitude ?? v.longitude,
          speed:           data.speed ?? v.speed,
          ignition:        data.ignition ?? v.ignition,
          address:         data.address ?? v.address,
          todayKm:         data.todayKm != null ? Number(data.todayKm) : v.todayKm,
          stateChangedAt:  data.stateChangedAt ?? v.stateChangedAt,
          gsmSignal:       data.gsmSignal ?? v.gsmSignal,
          odometer:        data.odometer ?? v.odometer,
          batteryVoltage:  data.batteryVoltage ?? v.batteryVoltage,
          externalVoltage: data.externalVoltage ?? v.externalVoltage,
        }
      })
      return matched ? next : prev
    })
    setSecondsAgo(0)
  }

  async function load() {
    try {
      const res = await api.get('/telemetry/live')
      const mapped = (res.data || [])
        .filter(item => item.state && item.state.latitude && item.state.longitude)
        .map(item => ({
          id:              item.vehicle.id,
          imei:            item.vehicle.imei,
          name:            item.vehicle.name,
          latitude:        item.state.latitude,
          longitude:       item.state.longitude,
          speed:           item.state.speed || 0,
          ignition:        item.state.ignition || false,
          address:         item.state.address || null,
          todayKm:         item.state.todayKm ?? null,
          stateChangedAt:  item.state.stateChangedAt || null,
          gsmSignal:       item.state.gsmSignal ?? null,
          odometer:        item.state.odometer ?? null,
          batteryVoltage:  item.state.batteryVoltage ?? null,
          externalVoltage: item.state.externalVoltage ?? null,
        }))
      setVehicles(mapped)
      setSecondsAgo(0)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load vehicle data')
    } finally {
      setLoading(false)
    }
  }

  function handleMessage(event) {
    try {
      setSelected(JSON.parse(event.nativeEvent.data))
    } catch (err) {
      console.log('Map message error:', err.message)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load map</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  const moving    = vehicles.filter(v => v.speed > 0).length
  const idle      = vehicles.filter(v => v.speed === 0 && v.ignition).length
  const stopped   = vehicles.filter(v => !v.ignition && v.speed === 0).length
  const overspeed = vehicles.filter(v => v.speed > 110).length

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.statRow}>
        <StatTile label='Moving'    value={moving}    color='#14b8a6' active={activeFilter === 'moving'}    onPress={() => setActiveFilter(activeFilter === 'moving'    ? 'all' : 'moving')} />
        <StatTile label='Idle'      value={idle}      color='#f59e0b' active={activeFilter === 'idle'}      onPress={() => setActiveFilter(activeFilter === 'idle'      ? 'all' : 'idle')} />
        <StatTile label='Stopped'   value={stopped}   color='#9ca3af' active={activeFilter === 'stopped'}   onPress={() => setActiveFilter(activeFilter === 'stopped'   ? 'all' : 'stopped')} />
        <StatTile label='Overspeed' value={overspeed} color='#ef4444' active={activeFilter === 'overspeed'} onPress={() => setActiveFilter(activeFilter === 'overspeed' ? 'all' : 'overspeed')} />
      </View>
      <View style={styles.mapArea}>
      <View style={styles.updatedPill}>
        <View style={styles.pillInner}>
          <Text style={styles.updatedText}>Updated {secondsAgo} sec ago</Text>
        </View>
      </View>
      <WebView
        style={styles.webview}
        originWhitelist={['*']}
        source={{ html: buildMapHtml(MAPBOX_TOKEN, vehicles) }}
        javaScriptEnabled
        onMessage={handleMessage}
      />
      {selected && (
        <View style={styles.cardWrap}>
          <VehicleCard vehicle={selected} onClose={() => setSelected(null)} />
        </View>
      )}
      </View>
    </View>
  )
}

function StatTile({ label, value, color, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[tileStyles.tile, active && { backgroundColor: color + '18' }]}
    >
      <Text style={[tileStyles.value, { color }]}>{value}</Text>
      <Text style={tileStyles.label}>{label}</Text>
    </TouchableOpacity>
  )
}

const tileStyles = StyleSheet.create({
  tile:  { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  value: { fontSize: 20, fontWeight: '700' },
  label: { fontSize: 10, color: '#6b7280', marginTop: 1, fontWeight: '500' },
})

const styles = StyleSheet.create({
  container: { flex: 1 },
  statRow:   { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  mapArea:   { flex: 1 },
  webview:     { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  errorTitle:  { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  errorSub:    { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  updatedPill: { position: 'absolute', top: 12, left: 0, right: 0, alignItems: 'center', zIndex: 10 },
  pillInner: {
    backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
  },
  updatedText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  cardWrap:    { position: 'absolute', bottom: 0, left: 0, right: 0 },
})