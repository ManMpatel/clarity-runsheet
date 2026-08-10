// Android Google Maps has no built-in "muted" style like iOS's `mapType="mutedStandard"` — it
// takes a raw style JSON instead. This desaturates roads/land/POI labels and hides business POI
// icons/transit clutter, so the map reads as a neutral backdrop for the vehicle markers instead
// of competing with them, matching the muted cartography Uber's app uses. Two variants so the map
// itself follows the app's light/dark setting rather than just tinting UI chrome around a
// permanently-light map.
export const mapStyleLight = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f3' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7c7c7c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#f5f5f3' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#e0e0e0' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8ece6' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#e6e6e6' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#f2ede3' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#d4e3ea' }] },
]

export const mapStyleDark = [
  { elementType: 'geometry', stylers: [{ color: '#0f0f13' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7a7a83' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f0f13' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#2a2a30' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#161a17' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e1e24' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#141418' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#26262e' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b1620' }] },
]
