import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, ActivityIndicator, RefreshControl } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { FlashList } from '@shopify/flash-list'
import { BellOff, Gauge, Clock, Wrench, BatteryWarning, MapPinOff, Truck, Siren, Cable, TrendingDown, TrendingUp, CornerUpRight } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { useTabBarClearance } from '../../navigation/tabBarLayout'
import { EmptyState, ErrorState, Skeleton, useToast } from '../../components/ui'
import { useFleetSocket } from '../../hooks/useSocket'

// Must stay in step with alertTypeEnum in backend/src/db/schema/alerts.ts — anything missing here
// renders as its raw identifier ("harshBraking") with a generic bell. The three harsh-driving
// types were exactly that until now.
const TYPE_META = {
  afterHours:         { label: 'After Hours',        icon: Clock,          severity: 'warning' },
  speeding:           { label: 'Speeding',           icon: Gauge,          severity: 'warning' },
  engineFault:        { label: 'Engine Fault',       icon: Wrench,         severity: 'critical' },
  lowBattery:         { label: 'Low Battery',        icon: BatteryWarning, severity: 'warning' },
  geofenceBreach:     { label: 'Geofence Breach',    icon: MapPinOff,      severity: 'warning' },
  towing:             { label: 'Towing Detected',    icon: Truck,          severity: 'critical' },
  crash:              { label: 'Crash Detected',     icon: Siren,          severity: 'critical' },
  harshBraking:       { label: 'Harsh Braking',      icon: TrendingDown,   severity: 'warning' },
  harshAcceleration:  { label: 'Harsh Acceleration', icon: TrendingUp,     severity: 'warning' },
  harshCornering:     { label: 'Harsh Cornering',    icon: CornerUpRight,  severity: 'warning' },
  maintenanceDue:     { label: 'Maintenance Due',    icon: Wrench,         severity: 'info' },
  tamper:             { label: 'Tamper / Power Cut', icon: Cable,          severity: 'critical' },
}

function dayLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function AlertsScreen() {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeInsets()
  const toast = useToast()
  const tabBarClearance = useTabBarClearance()

  const [alerts, setAlerts] = useState([])
  const [unread, setUnread] = useState(0)
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  // Live alerts arrive over the socket while the app's open (backend broadcasts both a socket
  // emit and a push for every fired alert — see fireAlert in processors/alerts.ts) — prepend them
  // rather than waiting for the next pull-to-refresh.
  useFleetSocket({
    onAlert: (alert) => {
      setAlerts((list) => [alert, ...list])
      setUnread((u) => u + 1)
    },
  })

  async function load({ isRefresh = false } = {}) {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const res = await api.get('/alerts?limit=25')
      setAlerts(res.data.alerts || [])
      setUnread(res.data.unread || 0)
      setCursor(res.data.nextCursor || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load alerts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await api.get(`/alerts?limit=25&cursor=${encodeURIComponent(cursor)}`)
      setAlerts((list) => [...list, ...(res.data.alerts || [])])
      setCursor(res.data.nextCursor || null)
    } catch (err) {
      toast.show(err.response?.data?.message || 'Could not load more alerts', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  // These three write optimistically and roll back on failure. They used to swallow the error into
  // console.log, so a failed write left the UI showing a state the server never accepted — the
  // alert looked read, then silently came back unread on the next load.
  async function markRead(id) {
    const previous = alerts
    const previousUnread = unread
    setAlerts((list) => list.map((a) => (a.id === id ? { ...a, read: true } : a)))
    setUnread((u) => Math.max(0, u - 1))
    try {
      await api.put(`/alerts/${id}/read`)
    } catch (err) {
      setAlerts(previous)
      setUnread(previousUnread)
      toast.show(err.response?.data?.message || 'Could not mark as read', 'error')
    }
  }

  async function markAllRead() {
    const previous = alerts
    const previousUnread = unread
    setAlerts((list) => list.map((a) => ({ ...a, read: true })))
    setUnread(0)
    try {
      await api.put('/alerts/read-all')
    } catch (err) {
      setAlerts(previous)
      setUnread(previousUnread)
      toast.show(err.response?.data?.message || 'Could not mark all as read', 'error')
    }
  }

  const grouped = useMemo(() => {
    const groups = []
    let currentDay = null
    for (const alert of alerts) {
      const day = new Date(alert.createdAt).toDateString()
      if (day !== currentDay) {
        currentDay = day
        groups.push({ type: 'header', id: `h-${day}`, label: dayLabel(alert.createdAt) })
      }
      groups.push({ type: 'alert', id: alert.id, alert })
    }
    return groups
  }, [alerts])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: space.lg, paddingBottom: space.md }}>
        <View>
          <Text style={[type.title1, { color: colors.fg }]}>Alerts</Text>
          {unread > 0 && <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{unread} new</Text>}
        </View>
        {unread > 0 && (
          <Pressable onPress={markAllRead} hitSlop={8} style={{ marginTop: space.xs }}>
            <Text style={[type.captionMedium, { color: colors.accent }]}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: space.lg }}>
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height={64} radius={radius.md} style={{ marginBottom: space.sm }} />)}
        </View>
      ) : (
        <FlashList
          data={grouped}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: tabBarClearance }}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor={colors.fgMuted} />}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.accent} style={{ marginVertical: space.md }} /> : null}
          ListEmptyComponent={<EmptyState icon={<BellOff size={36} color={colors.fgSubtle} />} title="You're all caught up" message='New alerts will show up here' />}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={[type.captionMedium, { color: colors.fgMuted, marginTop: space.md, marginBottom: space.sm }]}>{item.label}</Text>
            ) : (
              <AlertRow alert={item.alert} onPress={() => !item.alert.read && markRead(item.alert.id)} />
            )
          }
        />
      )}
    </View>
  )
}

function AlertRow({ alert, onPress }) {
  const { colors, space, radius, type } = useTheme()
  const meta = TYPE_META[alert.type] || { label: alert.type, icon: BellOff, severity: 'info' }
  const Icon = meta.icon
  const railColor = { critical: colors.danger, warning: colors.warning, info: colors.info }[alert.severity || meta.severity]

  return (
    <Pressable onPress={onPress} style={{ marginBottom: space.sm }}>
      <View style={{
        flexDirection: 'row', backgroundColor: alert.read ? colors.surface : colors.accentSoft,
        borderRadius: radius.md, overflow: 'hidden',
      }}>
        <View style={{ width: 4, backgroundColor: railColor }} />
        <View style={{ flex: 1, flexDirection: 'row', padding: space.md, alignItems: 'flex-start' }}>
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: railColor + '1F', alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
            <Icon size={16} color={railColor} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[type.bodySemibold, { color: colors.fg }]}>{meta.label}</Text>
              <Text style={[type.micro, { color: colors.fgSubtle }]}>
                {new Date(alert.createdAt).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </View>
            <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{alert.message}</Text>
          </View>
          {!alert.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginLeft: space.sm, marginTop: 6 }} />}
        </View>
      </View>
    </Pressable>
  )
}
