import { Children, forwardRef } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useTheme } from '../../theme'

// Apple's inset grouped list — the form pattern used throughout Settings and the Apple ID sign-in
// sheet. Rows share one rounded container with hairline separators between them, instead of each
// field being its own bordered box (which is what components/ui/Field.js does for the rest of
// the app). Used by screens/auth/ only — see DECISIONS.md D-017.
//
//  ┌──────────────────────────────────┐  iosGroupedSurface, radius 10
//  │  Email       you@company.com.au  │
//  ├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤  hairline, inset to the label's left edge
//  │  Password    ••••••••         ⊙  │
//  └──────────────────────────────────┘
//    Footer text sits outside the container, not inside it.

const ROW_HEIGHT = 48
const CORNER_RADIUS = 10 // UIKit's inset-grouped radius. Not radius.md — this is Apple's number.
const LABEL_WIDTH = 96

export function GroupedList({ children, style }) {
  const { colors, space } = useTheme()
  // Children.toArray drops null/undefined/false, so conditionally-rendered rows don't leave a
  // stray separator behind.
  const rows = Children.toArray(children)

  return (
    <View
      style={[
        {
          backgroundColor: colors.iosGroupedSurface,
          borderRadius: CORNER_RADIUS,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {rows.map((row, i) => (
        <View key={row.key ?? i}>
          {i > 0 && (
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: colors.iosSeparator,
                marginLeft: space.lg,
              }}
            />
          )}
          {row}
        </View>
      ))}
    </View>
  )
}

// A text-entry row. Keeps forwardRef + the `...inputProps` spread so it drops into call sites the
// same way ui/Field.js does. Errors are deliberately NOT rendered here — Apple puts them in the
// footer below the group, so use <GroupedFooter tone='danger'> for that.
export const GroupedField = forwardRef(function GroupedField(
  { label, right, labelWidth = LABEL_WIDTH, style, ...inputProps },
  ref
) {
  const { colors, space, appleType } = useTheme()

  // Android clips glyph descenders when a TextInput carries an explicit lineHeight, so the input
  // takes the font without it and gets its vertical rhythm from the row height instead.
  const { lineHeight, ...inputFont } = appleType.body

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: ROW_HEIGHT,
          paddingHorizontal: space.lg,
        },
        style,
      ]}
    >
      {!!label && (
        <Text style={[appleType.body, { color: colors.fg, width: labelWidth }]} numberOfLines={1}>
          {label}
        </Text>
      )}
      <TextInput
        ref={ref}
        placeholderTextColor={colors.iosLabelTertiary}
        style={[inputFont, { flex: 1, color: colors.fg, paddingVertical: space.md }]}
        {...inputProps}
      />
      {!!right && <View style={{ marginLeft: space.sm }}>{right}</View>}
    </View>
  )
})

// Non-input row, for a toggle or a tappable value. Same metrics as GroupedField so separators
// line up when the two are mixed in one group.
export function GroupedRow({ children, style }) {
  const { space } = useTheme()
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: ROW_HEIGHT,
          paddingHorizontal: space.lg,
          paddingVertical: space.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}

// The caption below a group — Apple's home for hints, validation errors and inline links. Inset
// to line up with the row content above it rather than the container edge.
export function GroupedFooter({ children, tone = 'secondary', style }) {
  const { colors, space, appleType } = useTheme()
  const color = tone === 'danger' ? colors.danger : colors.iosLabelSecondary

  return (
    <Text style={[appleType.footnote, { color, marginTop: space.sm, marginHorizontal: space.lg }, style]}>
      {children}
    </Text>
  )
}
