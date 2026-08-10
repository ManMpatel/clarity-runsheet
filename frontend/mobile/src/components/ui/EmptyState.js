import { View, Text } from 'react-native'
import { useTheme } from '../../theme'
import Button from './Button'

// Standard "nothing here yet" state — every list screen uses this instead of an empty <View/>,
// with an optional CTA (e.g. "Add your first vehicle").
export default function EmptyState({ icon, title, message, actionLabel, onAction }) {
  const { colors, space, type } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['3xl'] }}>
      {icon}
      <Text style={[type.title3, { color: colors.fg, marginTop: space.lg, textAlign: 'center' }]}>{title}</Text>
      {!!message && <Text style={[type.body, { color: colors.fgMuted, marginTop: space.xs, textAlign: 'center' }]}>{message}</Text>}
      {!!actionLabel && (
        <Button label={actionLabel} onPress={onAction} fullWidth={false} style={{ marginTop: space.xl, paddingHorizontal: space['2xl'] }} />
      )}
    </View>
  )
}
