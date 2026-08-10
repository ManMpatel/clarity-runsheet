import { forwardRef } from 'react'
import { ActivityIndicator, Pressable, Text, StyleSheet } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useTheme } from '../../theme'

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger']

// Every primary action in the app routes through this one component — variant/size/loading/
// disabled/haptics are handled once here instead of each screen re-implementing its own button
// (the old screens each had their own ad-hoc TouchableOpacity + StyleSheet).
const Button = forwardRef(function Button(
  { variant = 'primary', size = 'lg', label, icon, loading, disabled, onPress, style, fullWidth = true, haptic = true },
  ref
) {
  const { colors, radius, space, type } = useTheme()
  const isDisabled = disabled || loading

  const bg = {
    primary: colors.accent,
    secondary: colors.surface2,
    ghost: 'transparent',
    danger: colors.danger,
  }[variant]

  const fg = {
    primary: colors.fgOnAccent,
    secondary: colors.fg,
    ghost: colors.accent,
    danger: colors.fgOnAccent,
  }[variant]

  const heights = { sm: 36, md: 44, lg: 52 }

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
          height: heights[size],
          borderRadius: radius.md,
          paddingHorizontal: space.xl,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          borderWidth: variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon}
          {!!label && (
            <Text style={[type.bodySemibold, { color: fg, marginLeft: icon ? space.sm : 0 }]} numberOfLines={1}>
              {label}
            </Text>
          )}
        </>
      )}
    </Pressable>
  )
})

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
})

Button.VARIANTS = VARIANTS
export default Button
