import { View, Text, StyleSheet } from 'react-native'


export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Map</Text>
      <Text style={styles.sub}>Vehicle location will appear here</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  sub:       { fontSize: 13, color: '#9ca3af' },
})