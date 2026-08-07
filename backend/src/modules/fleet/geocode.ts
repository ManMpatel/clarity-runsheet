// Ported from api/services/geocode.js (Mapbox reverse-geocode helper). No DB access — just an
// import-path/module-style cleanup (CommonJS require/module.exports -> ES module import/export)
// to match the rest of the ported fleet module. Logic unchanged.
import axios from 'axios'

const cache = new Map<string, string>()

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const key = `${lat.toFixed(4)},${lon.toFixed(4)}`
  if (cache.has(key)) return cache.get(key)!

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${process.env.MAPBOX_TOKEN}&types=address`
    const response = await axios.get(url)
    const place = response.data.features?.[0]?.place_name || `${lat}, ${lon}`
    cache.set(key, place)
    return place
  } catch {
    return `${lat}, ${lon}`
  }
}
