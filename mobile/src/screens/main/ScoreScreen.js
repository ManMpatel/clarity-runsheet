import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'

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
    await Promise.all(
      driverList.map(async (d) => {
        try {
          const res = await api.get(`/api/drivers/${d._id}/score`)
          results[d._id] = res.data?.[0] || null
        } catch {
          results[d._id] = null
        }
      })
    )
    setScores(results)
  }

  function scoreColor(score) {
    if (score == null) return '#9ca3af'
    if (score >= 90) return '#0d9488'
    if (score >= 75) return '#d97706'
    return '#dc2626'
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
        <Text style={styles.errorTitle}>Couldn't load scores</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={drivers}
      keyExtractor={(item) => item._id}
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
  )
}

const styles = StyleSheet.create({
  list:       { flex: 1, backgroundColor: '#fff' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  errorSub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowInfo:    { flex: 1 },
  name:       { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 2 },
  mobile:     { fontSize: 12, color: '#9ca3af' },
  badge:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badgeText:  { fontSize: 15, fontWeight: '700', color: '#fff' },
})