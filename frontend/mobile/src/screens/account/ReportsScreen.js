import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Field, Button, Chip, Card, EmptyState } from '../../components/ui'

const REPORT_TYPES = [
  { id: 'driver-scores', label: 'Driver Scores' },
  { id: 'trip-summary', label: 'Trip Summary' },
  { id: 'fuel-idle', label: 'Fuel & Idle' },
  { id: 'vehicle-health', label: 'Vehicle Health' },
]

export default function ReportsScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const [selected, setSelected] = useState('driver-scores')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!from || !to) return setError('Please enter a date range')
    setError('')
    setData(null)
    setLoading(true)
    try {
      const res = await api.get(`/reports/${selected}?from=${from}&to=${to}`)
      setData(res.data)
    } catch (err) {
      setError(err.response?.status === 403 ? 'This report requires a higher subscription tier' : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  function renderResults() {
    if (!data) return null
    if (selected === 'driver-scores') {
      return (
        <FlashList
          data={data}
          keyExtractor={(item, i) => item.id || String(i)}
          estimatedItemSize={60}
          ListEmptyComponent={<EmptyState title='No scores in this range' />}
          renderItem={({ item }) => (
            <ResultRow main={new Date(item.weekStart).toLocaleDateString('en-AU')} value={item.overallScore ?? '—'} />
          )}
        />
      )
    }
    if (selected === 'trip-summary') {
      const s = data.summary || {}
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          <SummaryBox label='Total trips' value={s.totalTrips ?? 0} />
          <SummaryBox label='Total km' value={s.totalKm?.toFixed(1) ?? 0} />
          <SummaryBox label='Total mins' value={s.totalDuration ?? 0} />
          <SummaryBox label='Avg km/trip' value={s.avgKmPerTrip ?? 0} />
        </View>
      )
    }
    if (selected === 'fuel-idle') {
      return (
        <View style={{ flexDirection: 'row' }}>
          <SummaryBox label='Records' value={data.total ?? 0} />
          <SummaryBox label='Idle records' value={data.idleCount ?? 0} />
        </View>
      )
    }
    if (selected === 'vehicle-health') {
      return (
        <FlashList
          data={data}
          keyExtractor={(item, i) => item.vehicle?.id || String(i)}
          estimatedItemSize={60}
          ListEmptyComponent={<EmptyState title='No vehicle health data yet' />}
          renderItem={({ item }) => (
            <ResultRow main={item.vehicle?.name} sub={item.latest ? new Date(item.latest.time).toLocaleDateString('en-AU') : 'No data yet'} />
          )}
        />
      )
    }
    return null
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Reports' onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
          {REPORT_TYPES.map((r) => (
            <Chip key={r.id} label={r.label} active={selected === r.id} onPress={() => { setSelected(r.id); setData(null); setError('') }} />
          ))}
        </View>

        <View style={{ flexDirection: 'row' }}>
          <Field placeholder='From (YYYY-MM-DD)' value={from} onChangeText={setFrom} style={{ flex: 1, marginRight: space.sm }} />
          <Field placeholder='To (YYYY-MM-DD)' value={to} onChangeText={setTo} style={{ flex: 1 }} />
        </View>

        {!!error && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{error}</Text>}

        <Button label='Generate' loading={loading} onPress={handleGenerate} style={{ marginBottom: space.lg }} />

        {renderResults()}
      </ScrollView>
    </View>
  )
}

function SummaryBox({ label, value }) {
  const { colors, space, radius, type } = useTheme()
  return (
    <View style={{ flexBasis: '48%', marginRight: '4%', marginBottom: space.sm }}>
      <Card style={{ alignItems: 'center' }}>
        <Text style={[type.title2, { color: colors.fg }]}>{value}</Text>
        <Text style={[type.caption, { color: colors.fgMuted, marginTop: 4, textAlign: 'center' }]}>{label}</Text>
      </Card>
    </View>
  )
}

function ResultRow({ main, sub, value }) {
  const { colors, space, type } = useTheme()
  return (
    <Card style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm }}>
      <View>
        <Text style={[type.bodyMedium, { color: colors.fg }]}>{main}</Text>
        {!!sub && <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{sub}</Text>}
      </View>
      {value !== undefined && <Text style={[type.tabularBody, { color: colors.accent }]}>{value}</Text>}
    </Card>
  )
}
