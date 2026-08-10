import { Switch as RNSwitch } from 'react-native'
import { useTheme } from '../../theme'

// Thin wrapper so every toggle in the app (Alert preferences, geofence entry/exit, theme
// settings) uses the same track/thumb colours instead of the OS default green.
export default function Switch({ value, onValueChange, disabled }) {
  const { colors } = useTheme()
  return (
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.surface3, true: colors.accent }}
      thumbColor={colors.fgOnAccent}
      ios_backgroundColor={colors.surface3}
    />
  )
}
