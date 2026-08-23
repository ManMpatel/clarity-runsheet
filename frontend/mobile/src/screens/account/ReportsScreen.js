import { useEffect, useMemo, useState } from 'react'
import { View, Text, ScrollView, Share } from 'react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { formatKm, formatNumber } from '../../lib/format'
import { Header, Field, Button, Chip, Card, EmptyState } from '../../components/ui'

const REPORT_TYPES = [
  { id: 'driver-scores', label: 'Driver Scores' },
  { id: 'trip-summary', label: 'Trip Summary' },
  { id: 'fuel-idle', label: 'Fuel & Idle' },
  { id: 'vehicle-health', label: 'Vehicle Health' },
]

function csvEscape(value) {
  const s = value == null ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function tripSummaryCsv(trips, nameById) {
  const header = 'Vehicle,Start,End,Duration (min),Distance (km)'
  const rows = (trips || []).map((t) => [
    csvEscape(t.vehicleName || nameById[t.vehicleId] || t.vehicleId),
    csvEscape(t.startTime ? new Date(t.startTime).toISOString() : ''),
    csvEscape(t.endTime ? new Date(t.endTime).toISOString() : ''),
    csvEscape(t.durationMinutes ?? ''),
    csvEscape(t.distanceKm ?? ''),
  ].join(','))
  return [header, ...rows].join('\n')
}

export default function ReportsScreen({ navigation }) {
  const { colors, space, type } = useTheme()
  const [selected, setSelected] = useState('driver-scores')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [error, setError] = useState('')
  const [vehicles, setVehicles] = useState([])

  useEffect(() => {
    api.get('/vehicles').then((res) => setVehicles(res.data || [])).catch(() => {})
  }, [])

  const nameById = useMemo(
    () => Object.fromEntries(vehicles.map((v) => [v.id, v.name])),
    [vehicles],
  )

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

  async function handleShareCsv() {
    const trips = data?.trips || []
    if (trips.length === 0) return
    setSharing(true)
    try {
      await Share.share({
        title: 'Trip summary',
        message: tripSummaryCsv(trips, nameById),
      })
    } catch {
      setError('Could not share CSV')
    } finally {
      setSharing(false)
    }
  }

  // NOTE: these lists render with .map(), not FlashList. A FlashList inside this screen's
  // ScrollView is a same-orientation nested scroller with unbounded height — v2 can't virtualise
  // that and the rows come out blank. Report result sets are date-range bounded and small, so
  // there's nothing to virtualise anyway.
  function renderResults() {
    if (!data) return null
    if (selected === 'driver-scores') {
      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) return <EmptyState title='No scores in this range' />
      return rows.map((item, i) => (
        <ResultRow
          key={item.id || i}
          main={new Date(item.weekStart).toLocaleDateString('en-AU')}
          value={formatNumber(item.overallScore)}
        />
      ))
    }
    if (selected === 'trip-summary') {
      const s = data.summary || {}
      const trips = data.trips || []
      return (
        <View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            <SummaryBox label='Total trips' value={s.totalTrips ?? 0} />
            <SummaryBox label='Total km' value={formatNumber(s.totalKm, 1)} />
            <SummaryBox label='Total mins' value={formatNumber(s.totalDuration)} />
            <SummaryBox label='Avg km/trip' value={formatNumber(s.avgKmPerTrip, 1)} />
          </View>
          {trips.length > 0 && (
            <Button
              label='Share CSV'
              variant='secondary'
              loading={sharing}
              onPress={handleShareCsv}
              style={{ marginBottom: space.md }}
            />
          )}
          {trips.map((trip, i) => (
            <ResultRow
              key={trip.id || i}
              main={trip.vehicleName || nameById[trip.vehicleId] || 'Vehicle'}
              sub={trip.startTime ? new Date(trip.startTime).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
              value={formatKm(trip.distanceKm)}
            />
          ))}
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
      const rows = Array.isArray(data) ? data : []
      if (rows.length === 0) return <EmptyState title='No vehicle health data yet' />
      return rows.map((item, i) => (
        <ResultRow
          key={item.vehicle?.id || i}
          main={item.vehicle?.name}
          sub={item.latest ? new Date(item.latest.time).toLocaleDateString('en-AU') : 'No data yet'}
        />
      ))
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
  const { colors, space, type } = useTheme()
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
