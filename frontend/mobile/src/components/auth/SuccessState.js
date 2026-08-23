import { View, Text } from 'react-native'
import { MailCheck } from 'lucide-react-native'
import { useTheme } from '../../theme'
import AuthButton from './AuthButton'

// The "we've emailed you" terminal state, shared by SignupScreen and ForgotPasswordScreen — both
// previously hand-rolled the same 64pt tile / title / body / button block with slightly different
// numbers.
export default function SuccessState({ title, message, actionLabel, onAction }) {
  const { colors, space, appleType } = useTheme()

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: space.xl,
        }}
      >
        {/* accentFg, not accent — on the dark accentSoft tile the latter measures 3.25:1. */}
        <MailCheck size={32} color={colors.accentFg} strokeWidth={2} />
      </View>

      <Text style={[appleType.title1, { color: colors.fg, textAlign: 'center' }]}>{title}</Text>
      <Text
        style={[
          appleType.body,
          { color: colors.iosLabelSecondary, textAlign: 'center', marginTop: space.sm },
        ]}
      >
        {message}
      </Text>

      {!!actionLabel && (
        <AuthButton
          variant='tinted'
          label={actionLabel}
          onPress={onAction}
          style={{ marginTop: space['3xl'] }}
        />
      )}
    </View>
  )
}
