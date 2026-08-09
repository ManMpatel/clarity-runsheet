import { useEffect, useState } from 'react'
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'
import TopBar from '../../components/TopBar'

const SEVERITY_COLORS= { critical: '#dc2626', warning: '#d97706', info: colors.primary }
const TYPE_LABELS = {
  afterHours: 'After Hours', speeding: 'Speeding', engineFault: 'Engine Fault',
  lowBattery: 'Low Battery', geofenceBreach: 'Geofence Breach', towing: 'Towing Detected',
  crash: 'Crash Detected', maintenanceDue: 'Maintenance Due', tamper: 'Tamper / Power Cut',
}

export default function AlertsScreen() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/alerts?limit=50')
      setAlerts(res.data.alerts || [])
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load alerts')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    try {
      await api.put(`/alerts/${id}/read`)
      setAlerts(a => a.map(x => x.id === id ? { ...x, read: true } : x))
    } catch (err) {
      console.log(err.message)
    }
  }

  async function markAllRead() {
    try {
      await api.put('/alerts/read-all')
      setAlerts(a => a.map(x => ({ ...x, read: true })))
    } catch (err) {
      console.log(err.message)
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleString('en-AU', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })
  }

  const unreadCount = alerts.filter(a => !a.read).length

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
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
    <View style={styles.container}>
      <TopBar />
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Alerts</Text>
          {unreadCount > 0 && <Text style={styles.headerSub}>{unreadCount} new</Text>}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={alerts}
        keyExtractor={(item, i) => item.id || String(i)}
        ListEmptyComponent={
          <View style={styles.center}>
            <View style={styles.emptyIcon}>
              <MaterialIcons name='check-circle-outline' size={28} color={colors.textSecondary} />
            </View>
            <Text style={styles.errorTitle}>All caught up</Text>
            <Text style={styles.errorSub}>You're all caught up</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.read && styles.unreadRow]}
            onPress={() => !item.read && markRead(item.id)}
          >
            <View style={[styles.dot, { backgroundColor: SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.info }]} />
            <View style={styles.rowContent}>
              <View style={styles.rowTop}>
                <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
                <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
              </View>
              <Text style={styles.message}>{item.message}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.margin, paddingTop: 12, paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: '700', color: colors.textPrimary },
  headerSub:   { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  markAllText: { fontSize: 13, color: colors.primary, fontWeight: '600', marginTop: 6 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 56, height: 56, borderRadius: radius.lg, backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  errorTitle:  { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:    { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  row: {
    flexDirection: 'row', paddingHorizontal: spacing.margin, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'flex-start',
  },
  unreadRow:   { backgroundColor: '#eff4ff' },
  dot:         { width: 10, height: 10, borderRadius: 5, marginTop: 5, marginRight: 12 },
  rowContent:  { flex: 1 },
  rowTop:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  type:        { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  date:        { fontSize: 12, color: colors.textSecondary },
  message:     { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
})