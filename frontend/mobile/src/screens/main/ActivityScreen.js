import { useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { FlashList } from '@shopify/flash-list'
import { Truck, MapPinned } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Card, SegmentedControl, Skeleton, EmptyState, ErrorState } from '../../components/ui'

function formatTimeRange(start, end) {
  const opts = { hour: 'numeric', minute: '2-digit' }
  const s = new Date(start).toLocaleTimeString('en-AU', opts)
  const e = end ? new Date(end).toLocaleTimeString('en-AU', opts) : 'now'
  return `${s} – ${e}`
}

function formatDuration(mins) {
  if (!mins) return '—'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m} min`
}

function dayLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(Date.now() - 86400000)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })
}

export default function ActivityScreen() {
  const { colors, space, radius, type } = useTheme()
  const insets = useSafeAreaInsets()
  const navigation = useNavigation()

  const [tab, setTab] = useState('trips')
  const [trips, setTrips] = useState([])
  const [fbtTrips, setFbtTrips] = useState([])
  const [fbtSummary, setFbtSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const [tripsRes, fbtRes, summaryRes] = await Promise.all([
        api.get('/trips'),
        api.get('/fbt'),
        api.get('/fbt/summary'),
      ])
      setTrips(tripsRes.data.trips || [])
      setFbtTrips(fbtRes.data || [])
      setFbtSummary(summaryRes.data?.summary || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load activity')
    } finally {
      setLoading(false)
    }
  }

  async function classify(tripId, classification) {
    try {
      const res = await api.put(`/fbt/${tripId}/classify`, { classification })
      setFbtTrips((list) => list.map((t) => (t.id === tripId ? res.data : t)))
    } catch (err) {
      console.log(err.message)
    }
  }

  // Groups trips by calendar day for the sticky-feeling section headers Uber-style trip history
  // uses — the old flat list had no sense of "today" vs "3 days ago".
  const groupedTrips = useMemo(() => {
    const groups = []
    let currentDay = null
    for (const trip of trips) {
      const day = new Date(trip.startTime).toDateString()
      if (day !== currentDay) {
        currentDay = day
        groups.push({ type: 'header', id: `h-${day}`, label: dayLabel(trip.startTime) })
      }
      groups.push({ type: 'trip', id: trip.id, trip })
    }
    return groups
  }, [trips])

  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: space.sm, paddingBottom: space.md }}>
        <Text style={[type.title1, { color: colors.fg, marginBottom: space.md }]}>Activity</Text>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[{ label: 'Trips', value: 'trips' }, { label: 'FBT Logbook', value: 'fbt' }]}
        />
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: space.lg }}>
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} height={78} radius={radius.lg} style={{ marginBottom: space.sm }} />)}
        </View>
      ) : tab === 'trips' ? (
        <FlashList
          data={groupedTrips}
          keyExtractor={(item) => item.id}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space['5xl'] }}
          ListEmptyComponent={<EmptyState icon={<Truck size={36} color={colors.fgSubtle} />} title='No trips yet' message='Trips show up here once a vehicle starts moving' />}
          renderItem={({ item }) => item.type === 'header' ? (
            <Text style={[type.captionMedium, { color: colors.fgMuted, marginTop: space.md, marginBottom: space.sm }]}>{item.label}</Text>
          ) : (
            <Pressable onPress={() => navigation.navigate('TripReplay', { tripId: item.trip.id, trip: item.trip })} style={{ marginBottom: space.sm }}>
              <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                  <Truck size={18} color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodySemibold, { color: colors.fg }]} numberOfLines={1}>{item.trip.vehicleName || 'Vehicle'}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{formatTimeRange(item.trip.startTime, item.trip.endTime)} · {formatDuration(item.trip.durationMinutes)}</Text>
                </View>
                <Text style={[type.tabularBody, { color: colors.fg }]}>{item.trip.distanceKm ? `${item.trip.distanceKm.toFixed(1)} km` : '—'}</Text>
              </Card>
            </Pressable>
          )}
        />
      ) : (
        <FlashList
          data={fbtTrips}
          keyExtractor={(item, i) => item.id || String(i)}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space['5xl'] }}
          ListHeaderComponent={fbtSummary && (
            <View style={{ flexDirection: 'row', marginBottom: space.md }}>
              <SummaryTile label='Business km' value={fbtSummary.businessKm?.toFixed(0) ?? 0} />
              <SummaryTile label='Personal km' value={fbtSummary.personalKm?.toFixed(0) ?? 0} />
              <SummaryTile label='Unclassified' value={fbtSummary.unclassifiedTrips ?? 0} highlight={fbtSummary.unclassifiedTrips > 0} />
            </View>
          )}
          ListEmptyComponent={<EmptyState icon={<MapPinned size={36} color={colors.fgSubtle} />} title='No trips yet' message='Trips appear here once a vehicle starts moving' />}
          renderItem={({ item }) => (
            <Card style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[type.bodySemibold, { color: colors.fg }]} numberOfLines={1}>{item.vehicleName || 'Vehicle'}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{new Date(item.startTime).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' })}</Text>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <ClassifyChip label='Business' active={item.classification === 'business'} onPress={() => classify(item.id, 'business')} />
                  <ClassifyChip label='Personal' active={item.classification === 'personal'} onPress={() => classify(item.id, 'personal')} muted />
                </View>
              </View>
            </Card>
          )}
        />
      )}
    </View>
  )
}

function SummaryTile({ label, value, highlight }) {
  const { colors, space, radius, type } = useTheme()
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface2, borderRadius: radius.md, padding: space.sm, alignItems: 'center', marginRight: space.sm }}>
      <Text style={[type.tabularBody, { color: highlight ? colors.warning : colors.fg }]}>{value}</Text>
      <Text style={[type.micro, { color: colors.fgMuted, marginTop: 2, textAlign: 'center' }]}>{label}</Text>
    </View>
  )
}

function ClassifyChip({ label, active, onPress, muted }) {
  const { colors, space, radius, type } = useTheme()
  const activeColor = muted ? colors.fgMuted : colors.accent
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: space.sm, paddingVertical: 6, borderRadius: radius.sm, marginLeft: 6,
      backgroundColor: active ? activeColor : colors.surface2,
    }}>
      <Text style={[type.micro, { color: active ? colors.fgOnAccent : colors.fgMuted }]}>{label}</Text>
    </Pressable>
  )
}
