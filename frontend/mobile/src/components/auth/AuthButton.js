import { forwardRef } from 'react'
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'

const VARIANTS = ['filled', 'tinted', 'plain']

// Apple's full-width CTA, for screens/auth/ only. Separate from components/ui/Button because the
// two follow different doctrines: ui/Button is 52pt / radius 12 / 15pt semibold label, this is
// Apple's 50pt / radius 14 / 17pt headline. Same haptic, same loading/disabled semantics, so it
// behaves identically to the rest of the app under the hand.
//
// Sized to match AppleAuthentication.AppleAuthenticationButton's height + cornerRadius on the
// login screen — the native Apple button can't be restyled beyond those two values, so everything
// stacked with it has to meet it rather than the other way round.
const AuthButton = forwardRef(function AuthButton(
  { variant = 'filled', label, loading, disabled, onPress, style, haptic = true },
  ref
) {
  const { colors, appleType } = useTheme()
  const isDisabled = disabled || loading

  const bg = {
    filled: colors.accent,
    tinted: colors.iosFill,
    plain: 'transparent',
  }[variant]

  // `accent` is the fill colour; `accentFg` is its text-on-background counterpart. Using `accent`
  // as a label on the tinted fill measures 3.77:1 in dark mode — under AA — where `accentFg`
  // reaches 8.44:1. Every accent-coloured label and icon across screens/auth/ uses accentFg for
  // this reason; `accent` appears only as a fill.
  const fg = {
    filled: colors.fgOnAccent,
    tinted: colors.accentFg,
    plain: colors.accentFg,
  }[variant]

  function handlePress(e) {
    if (isDisabled) return
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    onPress?.(e)
  }

  return (
    <Pressable
      ref={ref}
      accessibilityRole='button'
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: bg,
          // iOS fades rather than scales on press, and goes further down than Material does.
          opacity: isDisabled ? 0.35 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[appleType.headline, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  base: {
    height: 50,
    borderRadius: 14,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

AuthButton.VARIANTS = VARIANTS
export default AuthButton
