export function buildMapHtml(token, vehicles) {
  const markersJson = JSON.stringify(vehicles || [])

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
  <script src="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js"></script>
  <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
  <style>
    body { margin: 0; padding: 0; }
    #map { position: absolute; top: 0; bottom: 0; width: 100%; }
    .van-marker {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid white;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    mapboxgl.accessToken = '${token}'
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [151.2093, -33.8688],
      zoom: 10
    })

    const vehicles = ${markersJson}

    map.on('load', () => {
      vehicles.forEach(v => {
        if (v.latitude && v.longitude) {
          const el = document.createElement('div')
          el.className = 'van-marker'
          el.style.background = v.speed > 0 ? '#14b8a6' : v.ignition ? '#f59e0b' : '#9ca3af'
          new mapboxgl.Marker(el)
            .setLngLat([v.longitude, v.latitude])
            .addTo(map)
        }
      })
    })
  </script>
</body>
</html>
`
}