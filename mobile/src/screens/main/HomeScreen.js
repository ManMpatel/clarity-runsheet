import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import api from '../../lib/api'
import { buildMapHtml } from '../../lib/mapHtml'
import { colors, radius, spacing } from '../../lib/theme'
import VehicleCard from '../../components/VehicleCard'
import TopBar from '../../components/TopBar'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN

export default function HomeScreen() {
  const [vehicles, setVehicles]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    load()
    const interval = setInterval(() => setSecondsAgo(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  async function load() {
    try {
      const res = await api.get('/api/telemetry/live')
      const mapped = (res.data || [])
        .filter(item => item.state && item.state.latitude && item.state.longitude)
        .map(item => ({
          _id:       item.vehicle._id,
          name:      item.vehicle.name,
          latitude:  item.state.latitude,
          longitude: item.state.longitude,
          speed:     item.state.speed || 0,
          ignition:  item.state.ignition || false,
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

  return (
    <View style={styles.container}>
      <TopBar />
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

const styles = StyleSheet.create({
  container:   { flex: 1 },
  mapArea:     { flex: 1 },
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