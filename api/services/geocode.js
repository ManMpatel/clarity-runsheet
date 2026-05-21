const axios = require('axios')

const cache = new Map()

async function reverseGeocode(lat, lon) {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${process.env.MAPBOX_TOKEN}&types=address`
    const res = await axios.get(url)
    const place = res.data.features?.[0]?.place_name || `${lat}, ${lon}`
    cache.set(key, place)
    return place
  } catch {
    return `${lat}, ${lon}`
  }
}

module.exports = { reverseGeocode }