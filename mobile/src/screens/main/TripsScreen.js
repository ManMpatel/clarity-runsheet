import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function TripsScreen() {
  const insets = useSafeAreaInsets()
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

  function formatTimeRange(start, end) {
    const opts = { hour: 'numeric', minute: '2-digit' }
    const s = new Date(start).toLocaleTimeString('en-AU', opts)
    const e = new Date(end).toLocaleTimeString('en-AU', opts)
    return `${s} - ${e}`
  }

  function formatDuration(mins) {
    if (!mins) return '--'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m} mins`
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
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
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.headerTitle}>Showing {trips.length} trips</Text>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item, i) => item._id || String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No trips yet</Text>
            <Text style={styles.errorSub}>Trips will show up here once a vehicle starts moving</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.iconBadge}>
                <MaterialIcons name='local-shipping' size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleName}>{item.vehicleName || item.vehicleId}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Time</Text>
                <Text style={styles.statValue}>{formatTimeRange(item.startTime, item.endTime)}</Text>
                <Text style={styles.statSub}>{formatDuration(item.durationMinutes)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{item.distanceKm ? `${item.distanceKm.toFixed(1)} km` : '--'}</Text>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      { paddingHorizontal: spacing.margin, paddingBottom: 8 },
  headerTitle: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  list:        { paddingHorizontal: spacing.margin, paddingBottom: spacing.lg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle:  { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  cardTop:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBadge: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  vehicleName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  divider:     { height: 1, backgroundColor: colors.border, marginVertical: spacing.sm },
  statsRow:    { flexDirection: 'row' },
  statLabel:   { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  statValue:   { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  statSub:     { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
})