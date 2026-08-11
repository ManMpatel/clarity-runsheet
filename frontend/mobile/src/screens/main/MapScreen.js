import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, Linking, Platform } from 'react-native'
import MapView from 'react-native-maps'
import BottomSheet, { BottomSheetFlatList, BottomSheetTextInput } from '@gorhom/bottom-sheet'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, LocateFixed, Navigation2, Power, X, Gauge, Fuel, BatteryMedium, SignalHigh } from 'lucide-react-native'
import { useTheme } from '../../theme'
import { useToast, Button, Card, StatTile, StatusDot, Skeleton, ErrorState } from '../../components/ui'
import VehicleMarker from '../../components/map/VehicleMarker'
import { useSocket } from '../../hooks/useSocket'
import { mapStyleLight, mapStyleDark } from '../../lib/mapStyle'
import { num, formatKm, formatVolts } from '../../lib/format'
import api from '../../lib/api'

const SYDNEY = { latitude: -33.8688, longitude: 151.2093, latitudeDelta: 0.2, longitudeDelta: 0.2 }

// How often to re-pull /telemetry/live while the socket is NOT connected. The socket is the
// primary path; this exists so a dropped connection (or an unreachable socket host) degrades to a
// slower map instead of a silently frozen one — which is exactly what shipped before, since
// EXPO_PUBLIC_SOCKET_URL was never set and the socket therefore never connected at all.
const POLL_INTERVAL_MS = 30000

function deriveStatus(v) {
  if (v.speed > 0) return 'moving'
  if (v.ignition) return 'idle'
  return 'stopped'
}

export default function MapScreen() {
  const { colors, space, radius, type, scheme, shadow } = useTheme()
  const insets = useSafeAreaInsets()
  const toast = useToast()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [query, setQuery] = useState('')
  // A timestamp, not a counter — the "Ns ago" ticker lives in <FreshnessPill/> below so that a
  // once-per-second re-render doesn't drag the whole screen (and every map marker) with it.
  const [lastUpdate, setLastUpdate] = useState(() => Date.now())
  const [commandBusy, setCommandBusy] = useState(false)

  const mapRef = useRef(null)
  const sheetRef = useRef(null)
  const hasFitOnce = useRef(false)
  const mountedRef = useRef(true)

  const snapPoints = useMemo(() => ['16%', '45%', '92%'], [])

  useEffect(() => {
    mountedRef.current = true
    load()
    return () => { mountedRef.current = false }
  }, [])

  // Merges live position/status changes in place — load() is a one-shot snapshot, everything
  // after arrives over `van:update` (backend/src/socket/index.ts).
  const socketStatus = useSocket(handleVanUpdate)

  // Fallback path: while the socket is down, re-pull the snapshot on an interval so the map stays
  // roughly current instead of freezing. Cleared as soon as the socket reconnects.
  useEffect(() => {
    if (socketStatus === 'connected') return undefined
    const id = setInterval(() => load({ silent: true }), POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [socketStatus])

  function handleVanUpdate(data) {
    setVehicles((prev) => {
      let matched = false
      const next = prev.map((v) => {
        if (v.id !== data.vehicleId && v.imei !== data.imei) return v
        matched = true
        return {
          ...v,
          latitude: data.latitude ?? v.latitude,
          longitude: data.longitude ?? v.longitude,
          speed: data.speed ?? v.speed,
          ignition: data.ignition ?? v.ignition,
          address: data.address ?? v.address,
          todayKm: data.todayKm != null ? num(data.todayKm) : v.todayKm,
          stateChangedAt: data.stateChangedAt ?? v.stateChangedAt,
          gsmSignal: data.gsmSignal != null ? num(data.gsmSignal) : v.gsmSignal,
          odometer: data.odometer != null ? num(data.odometer) : v.odometer,
          batteryVoltage: data.batteryVoltage != null ? num(data.batteryVoltage) : v.batteryVoltage,
          externalVoltage: data.externalVoltage != null ? num(data.externalVoltage) : v.externalVoltage,
        }
      })
      return matched ? next : prev
    })
    setLastUpdate(Date.now())
  }

  // `silent` is used by the polling fallback — a background refresh that fails shouldn't replace a
  // working map with a full-screen error; the freshness pill going stale is signal enough.
  async function load({ silent = false } = {}) {
    try {
      const res = await api.get('/telemetry/live')
      const mapped = (res.data || [])
        .filter((item) => item.state && item.state.latitude && item.state.longitude)
        .map((item) => ({
          id: item.vehicle.id,
          imei: item.vehicle.imei,
          name: item.vehicle.name,
          immobilised: item.vehicle.immobilised,
          latitude: item.state.latitude,
          longitude: item.state.longitude,
          speed: item.state.speed || 0,
          ignition: item.state.ignition || false,
          address: item.state.address || null,
          // These four are Postgres `numeric` columns and arrive as strings — normalise here so
          // the load path and the socket merge path below agree on their types (see lib/format.js).
          todayKm: num(item.state.todayKm),
          stateChangedAt: item.state.stateChangedAt || null,
          gsmSignal: num(item.state.gsmSignal),
          odometer: num(item.state.odometer),
          batteryVoltage: num(item.state.batteryVoltage),
          externalVoltage: num(item.state.externalVoltage),
        }))
      if (!mountedRef.current) return
      setVehicles(mapped)
      setLastUpdate(Date.now())
      if (!hasFitOnce.current && mapped.length > 0) {
        hasFitOnce.current = true
        requestAnimationFrame(() => fitToFleet(mapped))
      }
    } catch (err) {
      if (!silent && mountedRef.current) {
        setError(err.response?.data?.message || 'Could not load vehicle data')
      }
    } finally {
      if (mountedRef.current) setLoading(false)
    }
  }

  function fitToFleet(list) {
    const coords = (list || vehicles).map((v) => ({ latitude: v.latitude, longitude: v.longitude }))
    if (coords.length === 0 || !mapRef.current) return
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 60, bottom: 340, left: 60 },
      animated: true,
    })
  }

  const decorated = useMemo(() => vehicles.map((v) => ({ ...v, status: deriveStatus(v) })), [vehicles])

  const counts = useMemo(() => ({
    moving: decorated.filter((v) => v.status === 'moving').length,
    idle: decorated.filter((v) => v.status === 'idle').length,
    stopped: decorated.filter((v) => v.status === 'stopped').length,
    overspeed: decorated.filter((v) => v.speed > 110).length,
  }), [decorated])

  const filtered = useMemo(() => {
    let list = decorated
    if (activeFilter === 'overspeed') list = list.filter((v) => v.speed > 110)
    else if (activeFilter !== 'all') list = list.filter((v) => v.status === activeFilter)
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter((v) => v.name?.toLowerCase().includes(q) || v.address?.toLowerCase().includes(q))
    }
    return list
  }, [decorated, activeFilter, query])

  const selected = decorated.find((v) => v.id === selectedId) || null

  function selectVehicle(v) {
    setSelectedId(v.id)
    sheetRef.current?.snapToIndex(2)
    mapRef.current?.animateToRegion({ latitude: v.latitude, longitude: v.longitude, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500)
  }

  function toggleFilter(f) {
    setActiveFilter((cur) => (cur === f ? 'all' : f))
  }

  // Up to 60s of polling. Bails the moment the screen unmounts — otherwise navigating away
  // mid-immobilise leaves this running for a full minute and then calls setState on a dead tree.
  async function pollCommand(id) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
      if (!mountedRef.current) return { status: 'cancelled' }
      try {
        const res = await api.get(`/vehicles/${id}/command-status`)
        if (res.data.status === 'acked' || res.data.status === 'timeout') return res.data
      } catch { /* keep polling */ }
    }
    return { status: 'timeout' }
  }

  async function handleImmobiliseToggle(v) {
    if (v.speed > 0) return
    setCommandBusy(true)
    const action = v.immobilised ? 'restore' : 'cut'
    try {
      await api.post(`/vehicles/${v.id}/${action}`)
      toast.show(`${action === 'cut' ? 'Cut' : 'Restore'} command sent — confirming…`, 'info')
      const result = await pollCommand(v.id)
      if (result.status === 'cancelled') return
      if (result.status === 'acked') {
        setVehicles((prev) => prev.map((x) => x.id === v.id ? { ...x, immobilised: action === 'cut' } : x))
        toast.show(action === 'cut' ? 'Vehicle immobilised' : 'Vehicle restored', 'success')
      } else {
        toast.show('Device did not confirm — it may be out of signal', 'error')
      }
    } catch (err) {
      toast.show(err.response?.data?.message || 'Command failed', 'error')
    } finally {
      if (mountedRef.current) setCommandBusy(false)
    }
  }

  function navigateTo(v) {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${v.latitude},${v.longitude}`)
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); load() }} />
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SYDNEY}
        // Custom JSON style JSON only takes effect on the Google Maps provider (Android here) —
        // iOS stays on Apple Maps and gets its muted look from `mapType` instead. Apple Maps has
        // no per-app dark-map variant, so iOS dark mode gets the standard (not muted) style;
        // acceptable since Apple's own "standard" already reads fairly neutral.
        {...(Platform.OS === 'android'
          ? { customMapStyle: scheme === 'dark' ? mapStyleDark : mapStyleLight }
          : { mapType: scheme === 'dark' ? 'standard' : 'mutedStandard' })}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {decorated.map((v) => (
          <VehicleMarker key={v.id} vehicle={v} selected={v.id === selectedId} onPress={() => selectVehicle(v)} />
        ))}
      </MapView>

      <FreshnessPill since={lastUpdate} socketStatus={socketStatus} top={insets.top + space.sm} />

      <Pressable
        onPress={() => fitToFleet()}
        style={[styles.fab, { bottom: 230, backgroundColor: colors.surface, borderColor: colors.border }, shadow('sm')]}
      >
        <LocateFixed size={20} color={colors.fg} />
      </Pressable>

      <BottomSheet
        ref={sheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.border, width: 40 }}
      >
        {selected ? (
          <VehicleDetail
            vehicle={selected}
            busy={commandBusy}
            onClose={() => { setSelectedId(null); sheetRef.current?.snapToIndex(1) }}
            onToggleImmobilise={() => handleImmobiliseToggle(selected)}
            onNavigate={() => navigateTo(selected)}
          />
        ) : (
          <>
            <View style={{ paddingHorizontal: space.lg, paddingBottom: space.sm }}>
              <View style={styles.statRow}>
                <StatTile label='Moving' value={counts.moving} color={colors.statusMoving} active={activeFilter === 'moving'} onPress={() => toggleFilter('moving')} />
                <StatTile label='Idle' value={counts.idle} color={colors.statusIdle} active={activeFilter === 'idle'} onPress={() => toggleFilter('idle')} />
                <StatTile label='Stopped' value={counts.stopped} color={colors.statusStopped} active={activeFilter === 'stopped'} onPress={() => toggleFilter('stopped')} />
                <StatTile label='Overspeed' value={counts.overspeed} color={colors.danger} active={activeFilter === 'overspeed'} onPress={() => toggleFilter('overspeed')} />
              </View>

              <View style={[styles.searchBar, { backgroundColor: colors.surface2, borderRadius: radius.md }]}>
                <Search size={16} color={colors.fgSubtle} />
                <BottomSheetTextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder='Search vehicles or address'
                  placeholderTextColor={colors.fgSubtle}
                  style={[type.body, { flex: 1, color: colors.fg, paddingVertical: 10, marginLeft: space.sm }]}
                />
              </View>
            </View>

            {loading ? (
              <View style={{ paddingHorizontal: space.lg }}>
                {[0, 1, 2].map((i) => <Skeleton key={i} height={64} style={{ marginBottom: space.sm }} radius={radius.lg} />)}
              </View>
            ) : (
              <BottomSheetFlatList
                data={filtered}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: space['3xl'] }}
                renderItem={({ item }) => <VehicleRow vehicle={item} onPress={() => selectVehicle(item)} />}
                ListEmptyComponent={
                  <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space['2xl'] }]}>
                    No vehicles match this filter
                  </Text>
                }
              />
            )}
          </>
        )}
      </BottomSheet>
    </View>
  )
}

// Owns the once-per-second tick so MapScreen itself doesn't re-render (and re-diff every marker)
// every second just to advance a label. Also doubles as the socket-health indicator: if the socket
// isn't connected the map is running on the 30s polling fallback, and the user should be able to
// tell that from the screen rather than wondering why nothing is moving.
function FreshnessPill({ since, socketStatus, top }) {
  const { colors, space, type, shadow } = useTheme()
  const [, forceTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const seconds = Math.max(0, Math.round((Date.now() - since) / 1000))
  const live = socketStatus === 'connected'
  const label = socketStatus === 'connecting'
    ? 'Reconnecting…'
    : live
      ? `Updated ${seconds}s ago`
      : `Offline · updated ${seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`} ago`

  return (
    <View style={[styles.topPill, { top, backgroundColor: colors.surface + 'F2', borderColor: colors.border }, shadow('sm')]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, marginRight: space.xs, backgroundColor: live ? colors.statusMoving : colors.statusIdle }} />
      <Text style={[type.captionMedium, { color: colors.fgMuted }]}>{label}</Text>
    </View>
  )
}

function VehicleRow({ vehicle, onPress }) {
  const { colors, space, radius, type } = useTheme()
  return (
    <Pressable onPress={onPress} style={{ marginBottom: space.sm }}>
      <Card padded style={{ flexDirection: 'row', alignItems: 'center' }}>
        <StatusDot status={vehicle.status} size={10} />
        <View style={{ flex: 1, marginLeft: space.md }}>
          <Text style={[type.bodySemibold, { color: colors.fg }]} numberOfLines={1}>{vehicle.name}</Text>
          <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]} numberOfLines={1}>
            {vehicle.address || 'No address available'}
          </Text>
        </View>
        <Text style={[type.tabularBody, { color: colors.fg }]}>{vehicle.speed} km/h</Text>
      </Card>
    </Pressable>
  )
}

function StatRow({ icon, label, value }) {
  const { colors, space, type } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: space.sm }}>
      {icon}
      <Text style={[type.tabularBody, { color: colors.fg, marginTop: space.xs }]}>{value}</Text>
      <Text style={[type.micro, { color: colors.fgMuted }]}>{label}</Text>
    </View>
  )
}

function sinceLabel(ts) {
  if (!ts) return '—'
  const mins = Math.round((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function VehicleDetail({ vehicle, busy, onClose, onToggleImmobilise, onNavigate }) {
  const { colors, space, radius, type } = useTheme()
  const isMoving = vehicle.speed > 0

  return (
    <View style={{ paddingHorizontal: space.lg, paddingBottom: space['2xl'] }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <StatusDot status={vehicle.status} size={10} />
          <Text style={[type.title2, { color: colors.fg, marginLeft: space.sm }]}>{vehicle.name}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10}><X size={22} color={colors.fgMuted} /></Pressable>
      </View>

      {!!vehicle.address && (
        <Text style={[type.body, { color: colors.fgMuted, marginBottom: space.md }]}>{vehicle.address}</Text>
      )}

      <View style={[styles.detailGrid, { backgroundColor: colors.surface2, borderRadius: radius.lg }]}>
        <StatRow icon={<Gauge size={16} color={colors.fgMuted} />} label='Speed' value={`${vehicle.speed} km/h`} />
        <StatRow icon={<Fuel size={16} color={colors.fgMuted} />} label='Today' value={formatKm(vehicle.todayKm)} />
        <StatRow icon={<BatteryMedium size={16} color={colors.fgMuted} />} label='Voltage' value={formatVolts(vehicle.externalVoltage)} />
        <StatRow icon={<SignalHigh size={16} color={colors.fgMuted} />} label='Since' value={sinceLabel(vehicle.stateChangedAt)} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.dangerSoft, borderRadius: radius.lg, padding: space.md, marginTop: space.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={[type.bodySemibold, { color: colors.dangerFg }]}>Engine power</Text>
          <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>
            {isMoving ? 'Stop the vehicle to change this' : vehicle.immobilised ? 'Fuel currently cut' : 'Running normally'}
          </Text>
        </View>
        <Button
          label={vehicle.immobilised ? 'Restore' : 'Cut fuel'}
          variant='danger'
          size='sm'
          fullWidth={false}
          loading={busy}
          disabled={isMoving || busy}
          onPress={onToggleImmobilise}
          icon={<Power size={14} color={colors.fgOnAccent} />}
        />
      </View>

      <Button
        label='Navigate to vehicle'
        variant='secondary'
        icon={<Navigation2 size={16} color={colors.fg} />}
        onPress={onNavigate}
        style={{ marginTop: space.md }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  topPill: { position: 'absolute', alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  fab: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statRow: { flexDirection: 'row', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
})
