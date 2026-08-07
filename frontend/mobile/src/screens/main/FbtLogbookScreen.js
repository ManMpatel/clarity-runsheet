import { useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

export default function FbtLogbookScreen() {
  const [trips, setTrips]     = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [tRes, sRes] = await Promise.all([
        api.get('/fbt'),
        api.get('/fbt/summary'),
      ])
      setTrips(tRes.data || [])
      setSummary(sRes.data?.summary || null)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load FBT logbook')
    } finally {
      setLoading(false)
    }
  }

  async function classify(tripId, classification) {
    try {
      const res = await api.put(`/fbt/${tripId}/classify`, { classification })
      setTrips(t => t.map(trip => trip.id === tripId ? res.data : trip))
    } catch (err) {
      console.log(err.message)
    }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load FBT logbook</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {summary && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.businessKm?.toFixed(0) ?? 0}</Text>
            <Text style={styles.summaryLabel}>Business km</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.personalKm?.toFixed(0) ?? 0}</Text>
            <Text style={styles.summaryLabel}>Personal km</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.unclassifiedTrips ?? 0}</Text>
            <Text style={styles.summaryLabel}>Unclassified</Text>
          </View>
        </View>
      )}

      <FlatList
        data={trips}
        keyExtractor={(item, i) => item.id || String(i)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No trips yet</Text>
            <Text style={styles.errorSub}>Trips will appear here once a vehicle starts moving</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicle}>{item.vehicleName || item.vehicleId}</Text>
              <Text style={styles.date}>{formatDate(item.startTime)}</Text>
            </View>
            <View style={styles.toggleRow}>
              <TouchableOpacity
                style={[styles.toggleBtn, item.classification === 'business' && styles.toggleBusiness]}
                onPress={() => classify(item.id, 'business')}
              >
                <Text style={[styles.toggleText, item.classification === 'business' && styles.toggleTextActive]}>Business</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, item.classification === 'personal' && styles.togglePersonal]}
                onPress={() => classify(item.id, 'personal')}
              >
                <Text style={[styles.toggleText, item.classification === 'personal' && styles.toggleTextActive]}>Personal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: colors.background },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle:   { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:     { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  summaryRow:   { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.margin, paddingTop: 16, paddingBottom: 12 },
  summaryCard:  { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.sm, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  summaryLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2, textAlign: 'center' },
  list:         { paddingHorizontal: spacing.margin, paddingBottom: spacing.lg },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.sm,
  },
  vehicle:    { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  date:       { fontSize: 12, color: colors.textSecondary },
  toggleRow:  { flexDirection: 'row', gap: 6 },
  toggleBtn:  { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border },
  toggleBusiness: { backgroundColor: colors.primary, borderColor: colors.primary },
  togglePersonal: { backgroundColor: colors.textSecondary, borderColor: colors.textSecondary },
  toggleText: { fontSize: 11, color: colors.textPrimary, fontWeight: '600' },
  toggleTextActive: { color: '#fff' },
})