import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'
import TopBar from '../../components/TopBar'

export default function ScoreScreen() {
  const [drivers, setDrivers] = useState([])
  const [scores, setScores]   = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/api/drivers')
        setDrivers(res.data || [])
        await loadScores(res.data || [])
      } catch (err) {
        setError(err.response?.data?.error || 'Could not load drivers')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function loadScores(driverList) {
    const results = {}
    await Promise.all(driverList.map(async (d) => {
      try {
        const res = await api.get(`/api/drivers/${d._id}/score`)
        results[d._id] = res.data?.[0] || null
      } catch {
        results[d._id] = null
      }
    }))
    setScores(results)
  }

  function scoreColor(score) {
    if (score == null) return colors.placeholder
    if (score >= 90) return colors.primary
    if (score >= 75) return '#943700'
    return colors.error
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load scores</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <TopBar />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Driver Scores</Text>
        <Text style={styles.headerSub}>Real-time performance metrics across the fleet.</Text>
      </View>

      <FlatList
        data={drivers}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorTitle}>No drivers yet</Text>
            <Text style={styles.errorSub}>Add drivers to start tracking safety scores</Text>
          </View>
        }
        renderItem={({ item }) => {
          const latest = scores[item._id]
          const score  = latest?.overallScore ?? null
          return (
            <View style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.mobile}>{item.mobile}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: scoreColor(score) }]}>
                <Text style={styles.badgeText}>{score ?? '--'}</Text>
              </View>
            </View>
          )
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header:      { paddingHorizontal: spacing.margin, paddingTop: 12, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  headerSub:   { fontSize: 14, color: colors.textSecondary },
  list:        { paddingHorizontal: spacing.margin, paddingBottom: spacing.lg },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle:  { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 16, paddingHorizontal: spacing.md, marginBottom: spacing.sm,
  },
  rowInfo:   { flex: 1 },
  name:      { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  mobile:    { fontSize: 13, color: colors.textSecondary },
  badge:     { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 18, fontWeight: '700', color: '#fff' },
})