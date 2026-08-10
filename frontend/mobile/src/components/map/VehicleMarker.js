import { memo, useEffect, useRef } from 'react'
import { View } from 'react-native'
import { MarkerAnimated, AnimatedRegion } from 'react-native-maps'
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

  useEffect(() => {
    regionRef.current.timing({
      latitude: vehicle.latitude,
      longitude: vehicle.longitude,
      duration: 900,
      useNativeDriver: false, // AnimatedRegion's lat/lng aren't transform/opacity — can't use the native driver
    }).start()
  }, [vehicle.latitude, vehicle.longitude])

  return (
    <MarkerAnimated coordinate={regionRef.current} onPress={onPress} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 34, height: 34 }}>
        {selected && (
          <View style={{
            position: 'absolute', width: 34, height: 34, borderRadius: 17,
            backgroundColor: color, opacity: 0.18,
          }} />
        )}
        <View style={{
          width: selected ? 18 : 14, height: selected ? 18 : 14, borderRadius: 9,
          backgroundColor: color, borderWidth: 2.5, borderColor: '#fff',
          // A heading pointer only makes sense while actually moving — a stationary/idle vehicle
          // has no meaningful bearing to show.
          transform: vehicle.status === 'moving' && vehicle.angle != null ? [{ rotate: `${vehicle.angle}deg` }] : undefined,
        }} />
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
