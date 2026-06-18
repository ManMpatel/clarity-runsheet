import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import api from '../../lib/api'

const SEVERITY_COLORS = {
  critical: '#dc2626',
  warning:  '#d97706',
  info:     '#2563eb',
}

const TYPE_LABELS = {
  afterHours:     'After Hours',
  speeding:       'Speeding',
  engineFault:    'Engine Fault',
  lowBattery:     'Low Battery',
  geofenceBreach: 'Geofence Breach',
  towing:         'Towing Detected',
  crash:          'Crash Detected',
}

export default function AlertsScreen() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    try {
      const res = await api.get('/api/alerts?limit=50')
      setAlerts(res.data.alerts || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load alerts')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    try {
      await api.put(`/api/alerts/${id}/read`)
      setAlerts(a => a.map(x => x._id === id ? { ...x, read: true } : x))
    } catch (err) {
      console.log(err.message)
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString('en-AU', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    })
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
        <Text style={styles.errorTitle}>Couldn't load alerts</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.list}
      data={alerts}
      keyExtractor={(item, i) => item._id || String(i)}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.errorTitle}>No alerts</Text>
          <Text style={styles.errorSub}>You're all caught up</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={[styles.row, !item.read && styles.unreadRow]}
          onPress={() => !item.read && markRead(item._id)}
        >
          <View style={[styles.dot, { backgroundColor: SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.info }]} />
          <View style={styles.rowContent}>
            <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list:       { flex: 1, backgroundColor: '#fff' },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 6 },
  errorSub:   { fontSize: 13, color: '#9ca3af', textAlign: 'center', paddingHorizontal: 24 },
  row:        { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', alignItems: 'flex-start' },
  unreadRow:  { backgroundColor: '#eff6ff' },
  dot:        { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 12 },
  rowContent: { flex: 1 },
  type:       { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 2 },
  message:    { fontSize: 13, color: '#4b5563', marginBottom: 4 },
  date:       { fontSize: 11, color: '#9ca3af' },
})