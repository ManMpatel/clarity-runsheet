import { View, Text } from 'react-native'
import { useTheme } from '../../theme'

const TONES = ['neutral', 'accent', 'success', 'warning', 'danger', 'info']

// Small inline pills — alert severity, subscription tier, read/unread count. `tone` maps to the
// *-soft/*-fg token pairs so it automatically reads correctly in dark mode too.
export default function Badge({ label, tone = 'neutral' }) {
  const { colors, space, radius, type } = useTheme()

  const map = {
    neutral: { bg: colors.surface2, fg: colors.fgMuted },
    accent: { bg: colors.accentSoft, fg: colors.accentFg },
    success: { bg: colors.successSoft, fg: colors.successFg },
    warning: { bg: colors.warningSoft, fg: colors.warningFg },
    danger: { bg: colors.dangerSoft, fg: colors.dangerFg },
    info: { bg: colors.infoSoft, fg: colors.infoFg },
  }[tone]

  return (
    <View style={{ backgroundColor: map.bg, borderRadius: radius.full, paddingHorizontal: space.sm, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={[type.micro, { color: map.fg }]}>{label}</Text>
    </View>
  )
}

Badge.TONES = TONES
