import { View, Text, StyleSheet } from 'react-native'

export default function ScoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Driver Score</Text>
      <Text style={styles.sub}>Your safety score will appear here</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title:     { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8 },
  sub:       { fontSize: 13, color: '#9ca3af' },
})