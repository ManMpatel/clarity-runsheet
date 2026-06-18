import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { WebView } from 'react-native-webview'
import api from '../../lib/api'
import { buildMapHtml } from '../../lib/mapHtml'

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN

export default function HomeScreen() {
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/telemetry/live')
        setVehicles(res.data || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load vehicle data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size='large' color='#2563eb' />
      </View>
    )
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
    <WebView
      style={styles.webview}
      originWhitelist={['*']}
      source={{ html: buildMapHtml(MAPBOX_TOKEN, vehicles) }}
      javaScriptEnabled
    />
  )
}

const styles = StyleSheet.create({
  webview:    { flex: 1 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  errorSub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
})