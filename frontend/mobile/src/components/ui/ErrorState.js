import { View, Text } from 'react-native'
import { TriangleAlert } from 'lucide-react-native'
import { useTheme } from '../../theme'
import Button from './Button'

// Standard "something went wrong" state with a retry — every screen's failed-fetch branch uses
// this instead of a bare error string (the old screens each hand-rolled their own).
export default function ErrorState({ title = "Couldn't load this", message, onRetry }) {
  const { colors, space, type } = useTheme()
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['3xl'] }}>
      <TriangleAlert size={40} color={colors.danger} strokeWidth={1.5} />
      <Text style={[type.title3, { color: colors.fg, marginTop: space.lg, textAlign: 'center' }]}>{title}</Text>
      {!!message && <Text style={[type.body, { color: colors.fgMuted, marginTop: space.xs, textAlign: 'center' }]}>{message}</Text>}
      {!!onRetry && (
        <Button label='Try again' variant='secondary' onPress={onRetry} fullWidth={false} style={{ marginTop: space.xl, paddingHorizontal: space['2xl'] }} />
      )}
    </View>
  )
}
