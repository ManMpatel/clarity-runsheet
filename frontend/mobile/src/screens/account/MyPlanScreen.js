import { useEffect, useState } from 'react'
import { View, Text } from 'react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Card, Skeleton, ErrorState } from '../../components/ui'

const TIER_LABELS = { entry: 'Entry', mid: 'Mid', top: 'Top', locked: 'Not yet active' }

export default function MyPlanScreen({ navigation }) {
  const { colors, space, type } = useTheme()
  const [company, setCompany] = useState(null)
  const [vehicleCount, setVehicleCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [cRes, vRes] = await Promise.all([api.get('/settings/company'), api.get('/vehicles')])
      setCompany(cRes.data)
      setVehicleCount((vRes.data || []).length)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load plan details')
    } finally {
      setLoading(false)
    }
  }

  const slots = { entrySlots: company?.entrySlots || 0, midSlots: company?.midSlots || 0, topSlots: company?.topSlots || 0 }
  const totalSlots = slots.entrySlots + slots.midSlots + slots.topSlots

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='My Plan' onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={200} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <View style={{ padding: space.lg }}>
          <Card padded={false}>
            <View style={{ padding: space.lg }}>
              <Label>Current plan</Label>
              <Text style={[type.title1, { color: colors.fg, marginTop: 4 }]}>{TIER_LABELS[company?.subscriptionTier] || company?.subscriptionTier || '—'}</Text>
            </View>
            <Divider />
            <View style={{ padding: space.lg }}>
              <Label>Vehicle slots</Label>
              <Text style={[type.title3, { color: colors.fg, marginTop: 4 }]}>{vehicleCount} of {totalSlots || 0} used</Text>
            </View>
            <Divider />
            <View style={{ padding: space.lg, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Breakdown label='Entry' value={slots.entrySlots || 0} />
              <Breakdown label='Mid' value={slots.midSlots || 0} />
              <Breakdown label='Top' value={slots.topSlots || 0} />
            </View>
          </Card>
        </View>
      )}
    </View>
  )
}

function Label({ children }) {
  const { colors, type } = useTheme()
  return <Text style={[type.micro, { color: colors.fgSubtle, textTransform: 'uppercase' }]}>{children}</Text>
}
function Divider() {
  const { colors } = useTheme()
  return <View style={{ height: 1, backgroundColor: colors.border }} />
}
function Breakdown({ label, value }) {
  const { colors, type } = useTheme()
  return (
    <View>
      <Text style={[type.title3, { color: colors.fg }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.fgMuted }]}>{label}</Text>
    </View>
  )
}
