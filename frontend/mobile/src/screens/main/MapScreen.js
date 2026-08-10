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
import api from '../../lib/api'

const SYDNEY = { latitude: -33.8688, longitude: 151.2093, latitudeDelta: 0.2, longitudeDelta: 0.2 }

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
  const [secondsAgo, setSecondsAgo] = useState(0)
  const [commandBusy, setCommandBusy] = useState(false)

  const mapRef = useRef(null)
  const sheetRef = useRef(null)
  const hasFitOnce = useRef(false)

  const snapPoints = useMemo(() => ['16%', '45%', '92%'], [])

  useEffect(() => {
    load()
    const interval = setInterval(() => setSecondsAgo((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Merges live position/status changes in place — the initial load() below is a one-shot
  // snapshot, everything after arrives over `van:update` (backend/src/socket/index.ts).
  useSocket(handleVanUpdate)

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
          todayKm: data.todayKm != null ? Number(data.todayKm) : v.todayKm,
          stateChangedAt: data.stateChangedAt ?? v.stateChangedAt,
          gsmSignal: data.gsmSignal ?? v.gsmSignal,
          odometer: data.odometer ?? v.odometer,
          batteryVoltage: data.batteryVoltage ?? v.batteryVoltage,
          externalVoltage: data.externalVoltage ?? v.externalVoltage,
        }
      })
      return matched ? next : prev
    })
    setSecondsAgo(0)
  }

  async function load() {
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
          todayKm: item.state.todayKm ?? null,
          stateChangedAt: item.state.stateChangedAt || null,
          gsmSignal: item.state.gsmSignal ?? null,
          odometer: item.state.odometer ?? null,
          batteryVoltage: item.state.batteryVoltage ?? null,
          externalVoltage: item.state.externalVoltage ?? null,
        }))
      setVehicles(mapped)
      setSecondsAgo(0)
      if (!hasFitOnce.current && mapped.length > 0) {
        hasFitOnce.current = true
        requestAnimationFrame(() => fitToFleet(mapped))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load vehicle data')
    } finally {
      setLoading(false)
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

  async function pollCommand(id) {
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000))
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
      if (result.status === 'acked') {
        setVehicles((prev) => prev.map((x) => x.id === v.id ? { ...x, immobilised: action === 'cut' } : x))
        toast.show(action === 'cut' ? 'Vehicle immobilised' : 'Vehicle restored', 'success')
      } else {
        toast.show('Device did not confirm — it may be out of signal', 'error')
      }
    } catch (err) {
      toast.show(err.response?.data?.message || 'Command failed', 'error')
    } finally {
      setCommandBusy(false)
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

      <View style={[styles.topPill, { top: insets.top + space.sm, backgroundColor: colors.surface + 'F2', borderColor: colors.border }, shadow('sm')]}>
        <Text style={[type.captionMedium, { color: colors.fgMuted }]}>Updated {secondsAgo}s ago</Text>
      </View>

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
        <StatRow icon={<Fuel size={16} color={colors.fgMuted} />} label='Today' value={vehicle.todayKm != null ? `${vehicle.todayKm} km` : '—'} />
        <StatRow icon={<BatteryMedium size={16} color={colors.fgMuted} />} label='Voltage' value={vehicle.externalVoltage ? `${vehicle.externalVoltage}V` : '—'} />
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
  topPill: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  fab: { position: 'absolute', right: 16, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statRow: { flexDirection: 'row', marginTop: 4 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, marginTop: 8 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
})
