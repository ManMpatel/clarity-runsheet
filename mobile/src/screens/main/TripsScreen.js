import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'

export default function TripsScreen() {
  const [trips, setTrips]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/trips')
        setTrips(res.data.trips || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load trips')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function formatDate(date) {
    if (!date) return '--'
    return new Date(date).toLocaleString('en-AU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
  }

  function formatDuration(mins) {
    if (!mins) return '--'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

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
        <Text style={styles.errorTitle}>Couldn't load trips</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={trips}
      keyExtractor={(item, i) => item._id || String(i)}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.errorTitle}>No trips yet</Text>
          <Text style={styles.errorSub}>Trips will show up here once a vehicle starts moving</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.vehicle}>{item.vehicleName || item.vehicleId}</Text>
          <Text style={styles.meta}>{formatDate(item.startTime)} → {formatDate(item.endTime)}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>{item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : '--'}</Text>
            <Text style={styles.stat}>{formatDuration(item.durationMinutes)}</Text>
          </View>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list:       { flex: 1, backgroundColor: '#fff' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  errorSub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  row:        { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  vehicle:    { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 4 },
  meta:       { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  statsRow:   { flexDirection: 'row', gap: 16 },
  stat:       { fontSize: 13, color: '#374151', fontWeight: '500' },
})