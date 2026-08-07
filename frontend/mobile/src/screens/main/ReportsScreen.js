import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

const REPORT_TYPES = [
  { id: 'driver-scores', label: 'Driver Scores' },
  { id: 'trip-summary',  label: 'Trip Summary' },
  { id: 'fuel-idle',     label: 'Fuel & Idle' },
  { id: 'vehicle-health',label: 'Vehicle Health' },
]

export default function ReportsScreen() {
  const [selected, setSelected] = useState('driver-scores')
  const [from, setFrom]         = useState('')
  const [to, setTo]             = useState('')
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  async function handleGenerate() {
    if (!from || !to) {
      setError('Please enter a date range')
      return
    }
    setError('')
    setData(null)
    setLoading(true)
    try {
      const res = await api.get(`/api/reports/${selected}?from=${from}&to=${to}`)
      setData(res.data)
    } catch (err) {
      if (err.response?.status === 403) {
        setError('This report requires a higher subscription tier')
      } else {
        setError('Failed to generate report')
      }
    } finally {
      setLoading(false)
    }
  }

  function renderResults() {
    if (!data) return null

    if (selected === 'driver-scores') {
      return (
        <FlatList
          data={data}
          keyExtractor={(item, i) => item._id || String(i)}
          ListEmptyComponent={<Text style={styles.empty}>No scores in this range</Text>}
          renderItem={({ item }) => (
            <View style={styles.resultRow}>
              <Text style={styles.resultMain}>{new Date(item.weekStart).toLocaleDateString('en-AU')}</Text>
              <Text style={styles.resultScore}>{item.overallScore ?? '--'}</Text>
            </View>
          )}
        />
      )
    }

    if (selected === 'trip-summary') {
      const s = data.summary || {}
      return (
        <View style={styles.summaryGrid}>
          <SummaryBox label='Total Trips' value={s.totalTrips ?? 0} />
          <SummaryBox label='Total km' value={s.totalKm?.toFixed(1) ?? 0} />
          <SummaryBox label='Total mins' value={s.totalDuration ?? 0} />
          <SummaryBox label='Avg km/trip' value={s.avgKmPerTrip ?? 0} />
        </View>
      )
    }

    if (selected === 'fuel-idle') {
      return (
        <View style={styles.summaryGrid}>
          <SummaryBox label='Records' value={data.total ?? 0} />
          <SummaryBox label='Idle Records' value={data.idleCount ?? 0} />
        </View>
      )
    }

    if (selected === 'vehicle-health') {
      return (
        <FlatList
          data={data}
          keyExtractor={(item, i) => item.vehicle?._id || String(i)}
          ListEmptyComponent={<Text style={styles.empty}>No vehicle health data yet</Text>}
          renderItem={({ item }) => (
            <View style={styles.resultRow}>
              <Text style={styles.resultMain}>{item.vehicle?.name}</Text>
              <Text style={styles.resultSub}>{item.latest ? new Date(item.latest.timestamp).toLocaleDateString('en-AU') : 'No data yet'}</Text>
            </View>
          )}
        />
      )
    }

    return null
  }

  return (
    <View style={styles.container}>
      <View style={styles.chipRow}>
        {REPORT_TYPES.map(r => (
          <TouchableOpacity
            key={r.id}
            style={[styles.chip, selected === r.id && styles.chipActive]}
            onPress={() => { setSelected(r.id); setData(null); setError('') }}
          >
            <Text style={[styles.chipText, selected === r.id && styles.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.dateRow}>
        <TextInput style={[styles.input, { flex: 1 }]} placeholder='From (YYYY-MM-DD)' value={from} onChangeText={setFrom} />
        <TextInput style={[styles.input, { flex: 1 }]} placeholder='To (YYYY-MM-DD)' value={to} onChangeText={setTo} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.generateBtnText}>Generate</Text>}
      </TouchableOpacity>

      <View style={styles.results}>
        {renderResults()}
      </View>
    </View>
  )
}

function SummaryBox({ label, value }) {
  return (
    <View style={styles.summaryBox}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background, padding: spacing.margin },
  chipRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip:       { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:   { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  chipTextActive: { color: colors.onPrimary },
  dateRow:    { flexDirection: 'row', gap: 8, marginBottom: spacing.sm },
  input:      { height: 46, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 13, color: colors.textPrimary, backgroundColor: colors.surface },
  error:      { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  generateBtn:{ height: 48, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  generateBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
  results:    { flex: 1 },
  summaryGrid:{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  summaryBox: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, alignItems: 'center' },
  summaryValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  summaryLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4, textAlign: 'center' },
  resultRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  resultMain: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  resultSub:  { fontSize: 12, color: colors.textSecondary },
  resultScore:{ fontSize: 16, fontWeight: '700', color: colors.primary },
  empty:      { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginTop: 40 },
})