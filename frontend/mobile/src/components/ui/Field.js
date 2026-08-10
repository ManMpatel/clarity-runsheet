import { useState, forwardRef } from 'react'
import { View, Text, TextInput } from 'react-native'
import { useTheme } from '../../theme'

// Labeled text input with focus/error states — every auth screen and every edit form uses this
// instead of a bare TextInput, so focus rings, error copy, and spacing are consistent everywhere.
const Field = forwardRef(function Field(
  { label, error, helperText, style, right, ...inputProps },
  ref
) {
  const { colors, space, radius, type } = useTheme()
  const [focused, setFocused] = useState(false)

  const borderColor = error ? colors.danger : focused ? colors.ring : colors.border

  return (
    <View style={[{ marginBottom: space.lg }, style]}>
      {!!label && <Text style={[type.captionMedium, { color: colors.fgMuted, marginBottom: space.xs }]}>{label}</Text>}
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          ref={ref}
          placeholderTextColor={colors.fgSubtle}
          onFocus={(e) => { setFocused(true); inputProps.onFocus?.(e) }}
          onBlur={(e) => { setFocused(false); inputProps.onBlur?.(e) }}
          style={[
            type.body,
            {
              color: colors.fg,
              height: inputProps.multiline ? 90 : 52,
              textAlignVertical: inputProps.multiline ? 'top' : 'center',
              paddingVertical: inputProps.multiline ? space.md : 0,
              borderRadius: radius.md,
              borderWidth: focused ? 1.5 : 1,
              borderColor,
              paddingHorizontal: space.lg,
              paddingRight: right ? space['3xl'] : space.lg,
              backgroundColor: colors.surface,
            },
          ]}
          {...inputProps}
        />
        {!!right && <View style={{ position: 'absolute', right: space.lg }}>{right}</View>}
      </View>
      {(error || helperText) && (
        <Text style={[type.caption, { color: error ? colors.danger : colors.fgSubtle, marginTop: space.xs }]}>
          {error || helperText}
        </Text>
      )}
    </View>
  )
})

export default Field
