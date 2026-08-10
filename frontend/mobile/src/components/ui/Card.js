import { View, Pressable } from 'react-native'
import { useTheme } from '../../theme'

// The base surface every list row / stat tile / form section sits on. `onPress` swaps the
// container to a Pressable with the app-standard press feedback instead of every screen
// re-deciding what "pressed" should look like.
export default function Card({ children, onPress, style, padded = true, elevated = false }) {
  const { colors, radius, space, shadow } = useTheme()
  const base = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? space.lg : 0,
    ...(elevated ? shadow('sm') : null),
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [base, { opacity: pressed ? 0.7 : 1 }, style]}
      >
        {children}
      </Pressable>
    )
  }

  return <View style={[base, style]}>{children}</View>
}
