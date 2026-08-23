import { memo, useEffect, useRef, useState } from 'react'
import { View } from 'react-native'
import { MarkerAnimated, AnimatedRegion } from 'react-native-maps'
import { Navigation2 } from 'lucide-react-native'
import { statusColor } from '../ui/StatusDot'
import { useTheme } from '../../theme'

// The single biggest perceived-quality jump over the old WebView map: `mapHtml.js` rebuilt the
// entire HTML document (and every marker in it) on every `van:update`, so vehicles visibly
// teleported. `AnimatedRegion.timing()` here interpolates the marker's lat/lng smoothly between
// GPS pings instead — this is what makes the fleet actually look alive rather than "reload every
// few seconds".
function VehicleMarker({ vehicle, selected, onPress }) {
  const { colors } = useTheme()
  const color = statusColor(colors, vehicle.status)
  const regionRef = useRef(
    new AnimatedRegion({ latitude: vehicle.latitude, longitude: vehicle.longitude, latitudeDelta: 0, longitudeDelta: 0 })
  )
  // Custom marker views freeze unless tracksViewChanges is true for at least one frame after the
  // bitmap contents change (angle, selection, status). Flip it on, then off on the next frame so
  // we don't pay the per-frame cost of a constantly-redrawing marker.
  const [tracksViewChanges, setTracksViewChanges] = useState(true)

  useEffect(() => {
    regionRef.current.timing({
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      duration: 900,
      useNativeDriver: false, // AnimatedRegion's lat/lng aren't transform/opacity — can't use the native driver
    }).start()
  }, [vehicle.latitude, vehicle.longitude])

  useEffect(() => {
    setTracksViewChanges(true)
    const id = setTimeout(() => setTracksViewChanges(false), 80)
    return () => clearTimeout(id)
  }, [vehicle.angle, vehicle.status, selected])

  const moving = vehicle.status === 'moving' && vehicle.angle != null
  const size = selected ? 20 : 16

  return (
    <MarkerAnimated
      coordinate={regionRef.current}
      onPress={onPress}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      rotation={0}
    >
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 36, height: 36 }}>
        {selected && (
          <View style={{
            position: 'absolute', width: 36, height: 36, borderRadius: 18,
            backgroundColor: color, opacity: 0.18,
          }} />
        )}
        {moving ? (
          <View style={{ transform: [{ rotate: `${vehicle.angle}deg` }] }}>
            <Navigation2 size={size} color={color} fill={color} strokeWidth={2.4} />
          </View>
        ) : (
          <View style={{
            width: selected ? 18 : 14, height: selected ? 18 : 14, borderRadius: 9,
            backgroundColor: color, borderWidth: 2.5, borderColor: colors.surface,
          }} />
        )}
      </View>
    </MarkerAnimated>
  )
}

// Vehicle list objects are recreated on every socket merge (see MapScreen's setVehicles), so a
// shallow prop-level memo on lat/lng/status/selected specifically avoids re-rendering every
// marker on the map whenever any single vehicle updates.
export default memo(VehicleMarker, (prev, next) => (
  prev.vehicle.latitude === next.vehicle.latitude &&
  prev.vehicle.longitude === next.vehicle.longitude &&
  prev.vehicle.status === next.vehicle.status &&
  prev.vehicle.angle === next.vehicle.angle &&
  prev.selected === next.selected
))
