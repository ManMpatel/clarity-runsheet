import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colors, spacing } from '../lib/theme'

export default function TopBar() {
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Clarity Fleet</Text>
      <TouchableOpacity
        style={styles.accountBtn}
        onPress={() => navigation.navigate('Settings', { screen: 'Profile' })}
      >
        <MaterialIcons name='account-circle' size={28} color={colors.primary} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.margin, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.primary },
  accountBtn: { padding: 4 },
})