import { useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet } from 'react-native'
import MapView, { Polyline, Marker } from 'react-native-maps'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { X, Play, Pause } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { formatKm, formatDuration } from '../../lib/format'
import { Skeleton, ErrorState } from '../../components/ui'

// Trip replay didn't exist on mobile at all before this rebuild — GET /trips/:id/replay already
// existed server-side (used only by web's TripsHistory.jsx) and now already returns a
// server-decimated point list (max 2000 points, see backend/src/modules/fleet/routes/trips.ts)
// so this never has to render an unbounded polyline.
export default function TripReplayScreen({ route, navigation }) {
  // Defaulted rather than destructured straight off route.params: this screen is reachable from
  // the root stack, so a deep link or a restored navigation state can land here with no params at
  // all, and destructuring `undefined` would throw before the error boundary could show anything
  // useful.
  const { tripId, trip: tripPreview } = route.params || {}
  const { colors, space, radius, type, shadow } = useTheme()
  const insets = useSafeInsets()

  const [trip, setTrip] = useState(tripPreview || null)
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(0) // 0..1
  const [playing, setPlaying] = useState(false)

  const mapRef = useRef(null)
  const trackWidth = useRef(1)
  const playInterval = useRef(null)

  useEffect(() => { load() }, [tripId])

  useEffect(() => {
    if (!playing) { clearInterval(playInterval.current); return }
    playInterval.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 0.004
        if (next >= 1) { setPlaying(false); return 1 }
        return next
      })
    }, 40)
    return () => clearInterval(playInterval.current)
  }, [playing])

  async function load() {
    if (!tripId) {
      setError('No trip selected')
      setLoading(false)
      return
    }
    try {
      const res = await api.get(`/trips/${tripId}/replay`)
      setTrip(res.data.trip)
      setPoints(res.data.points || [])
      requestAnimationFrame(() => {
        const coords = (res.data.points || []).filter((p) => p.lat && p.lng).map((p) => ({ latitude: p.lat, longitude: p.lng }))
        if (coords.length > 0) mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 80, right: 60, bottom: 220, left: 60 }, animated: false })
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this trip')
    } finally {
      setLoading(false)
    }
  }

  const coords = useMemo(() => points.filter((p) => p.lat && p.lng).map((p) => ({ latitude: p.lat, longitude: p.lng, speed: p.speed, time: p.time })), [points])
  const cursorIndex = Math.min(coords.length - 1, Math.max(0, Math.round(progress * (coords.length - 1))))
  const cursor = coords[cursorIndex]

  function handleTrackTouch(e) {
    const x = e.nativeEvent.locationX
    const pct = Math.min(1, Math.max(0, x / trackWidth.current))
    setProgress(pct)
    setPlaying(false)
  }

  if (error) return <ErrorState message={error} onRetry={() => { setLoading(true); setError(null); load() }} />

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      {loading ? (
        <View style={{ flex: 1, padding: space.lg, paddingTop: insets.top + space.lg }}>
          <Skeleton height={40} width={120} style={{ marginBottom: space.lg }} />
          <Skeleton height='70%' radius={radius.lg} />
        </View>
      ) : (
        <>
          <View style={{ height: insets.top, backgroundColor: colors.canvas }} />
          <View style={{ flex: 1 }}>
          <MapView ref={mapRef} style={StyleSheet.absoluteFill}>
            {coords.length > 1 && <Polyline coordinates={coords} strokeColor={colors.accent} strokeWidth={4} />}
            {cursor && <Marker coordinate={cursor} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 3, borderColor: '#fff' }} />
            </Marker>}
          </MapView>

          <Pressable onPress={() => navigation.goBack()} style={[styles.closeBtn, { top: space.sm, backgroundColor: colors.surface, borderColor: colors.border }, shadow('sm')]}>
            <X size={20} color={colors.fg} />
          </Pressable>

          <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: insets.bottom + space.lg }, shadow('lg')]}>
            <Text style={[type.title3, { color: colors.fg }]}>{trip?.vehicleName || 'Trip'}</Text>
            <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2, marginBottom: space.md }]}>
              {formatDuration(trip?.durationMinutes)} · {formatKm(trip?.distanceKm)}
            </Text>

            <View
              onLayout={(e) => { trackWidth.current = e.nativeEvent.layout.width }}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handleTrackTouch}
              onResponderMove={handleTrackTouch}
              style={{ height: 28, justifyContent: 'center' }}
            >
              <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surface3 }}>
                <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.accent, width: `${progress * 100}%` }} />
              </View>
              <View style={{ position: 'absolute', left: `${progress * 100}%`, marginLeft: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface }} />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm }}>
              <Pressable onPress={() => setPlaying((p) => !p)} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                {playing ? <Pause size={18} color={colors.fgOnAccent} /> : <Play size={18} color={colors.fgOnAccent} style={{ marginLeft: 2 }} />}
              </Pressable>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[type.tabularBody, { color: colors.fg }]}>{cursor?.speed ?? 0} km/h</Text>
                <Text style={[type.micro, { color: colors.fgMuted }]}>{cursor?.time ? new Date(cursor.time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }) : '—'}</Text>
              </View>
            </View>
          </View>
          </View>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  closeBtn: { position: 'absolute', right: 16, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20 },
})
