import { View, Text, Pressable } from 'react-native'
import { useSafeInsets } from '../../hooks/useSafeInsets'
import { ChevronLeft } from 'lucide-react-native'
import { useTheme } from '../../theme'

// The large title every auth screen opens with. Drawn in the scroll content rather than handed to
// native-stack's `headerLargeTitle`, which is iOS-only and fights KeyboardAvoidingView — these
// screens are forms, so predictable beats collapse-on-scroll here. All four auth routes keep
// `headerShown: false` in navigation/index.js as a result.
//
// Owns its own safe-area top padding, so screens don't add insets.top a second time.
export default function AuthHeader({ title, subtitle, onBack }) {
  const { colors, space, appleType } = useTheme()
  const insets = useSafeInsets()

  return (
    <View style={{ paddingTop: insets.top + space.sm }}>
      {!!onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={16}
          accessibilityRole='button'
          accessibilityLabel='Go back'
          style={({ pressed }) => ({
            alignSelf: 'flex-start',
            marginBottom: space.lg,
            opacity: pressed ? 0.4 : 1,
          })}
        >
          {/* Tinted, not foreground-coloured — iOS back chevrons are always the tint colour.
              accentFg rather than accent: see the note in AuthButton.js. */}
          <ChevronLeft size={28} color={colors.accentFg} strokeWidth={2.5} />
        </Pressable>
      )}

      <Text style={[appleType.largeTitle, { color: colors.fg }]}>{title}</Text>

      {!!subtitle && (
        <Text style={[appleType.subheadline, { color: colors.iosLabelSecondary, marginTop: space.xs }]}>
          {subtitle}
        </Text>
      )}
    </View>
  )
}
