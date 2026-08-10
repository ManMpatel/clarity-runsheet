import { View, Text } from 'react-native'
import { useTheme } from '../../theme'

function initials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
}

// Used on the Account hub header and anywhere a user/driver needs a face — no photo upload exists
// in the backend, so this is always an initials avatar, colour-derived from the name so the same
// person always gets the same colour.
export default function Avatar({ name, size = 44 }) {
  const { type } = useTheme()
  const hue = (name || '').split('').reduce((s, c) => s + c.charCodeAt(0), 0) % 360
  const bg = `hsl(${hue}, 55%, 45%)`

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={[type.bodySemibold, { color: '#fff', fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  )
}
