import { useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import { Minus, Plus, CheckCircle2 } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { TIER_PRICING, TIER_LABELS } from '../../lib/pricing'
import { Header, Card, Field, Button } from '../../components/ui'

const PLANS = [
  { key: 'entrySlots', name: TIER_LABELS.entry, price: TIER_PRICING.entry },
  { key: 'midSlots', name: TIER_LABELS.mid, price: TIER_PRICING.mid },
  { key: 'topSlots', name: TIER_LABELS.top, price: TIER_PRICING.top },
]

export default function UpgradeScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const [form, setForm] = useState({ entrySlots: 0, midSlots: 0, topSlots: 0, message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function adjust(key, delta) {
    setForm((f) => ({ ...f, [key]: Math.max(0, f[key] + delta) }))
  }

  async function handleRequest() {
    if (!form.entrySlots && !form.midSlots && !form.topSlots) return setError('Please select at least one plan slot')
    setError('')
    setLoading(true)
    try {
      await api.post('/upgrade/request', form, { headers: { 'Idempotency-Key': `${Date.now()}` } })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  const total = PLANS.reduce((sum, p) => sum + form[p.key] * p.price, 0)

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Upgrade' onBack={() => navigation.goBack()} />
      {submitted ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: space['2xl'] }}>
          <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: colors.successSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.lg }}>
            <CheckCircle2 size={28} color={colors.success} />
          </View>
          <Text style={[type.title2, { color: colors.fg, textAlign: 'center' }]}>Request sent</Text>
          <Text style={[type.body, { color: colors.fgMuted, textAlign: 'center', marginTop: space.xs }]}>We'll be in touch shortly to set up your new plan.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}>
          <Text style={[type.title3, { color: colors.fg, marginBottom: space.lg }]}>Choose the right plan for your fleet</Text>

          {PLANS.map((p) => (
            <Card key={p.key} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.sm }}>
              <View style={{ flex: 1 }}>
                <Text style={[type.bodySemibold, { color: colors.fg }]}>{p.name}</Text>
                <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>${p.price}/van/month</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Stepper icon={<Minus size={14} color={colors.fg} />} onPress={() => adjust(p.key, -1)} />
                <Text style={[type.tabularBody, { color: colors.fg, minWidth: 24, textAlign: 'center' }]}>{form[p.key]}</Text>
                <Stepper icon={<Plus size={14} color={colors.fg} />} onPress={() => adjust(p.key, 1)} />
              </View>
            </Card>
          ))}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: space.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: space.sm, marginBottom: space.md }}>
            <Text style={[type.bodyMedium, { color: colors.fgMuted }]}>Estimated total</Text>
            <Text style={[type.title3, { color: colors.fg }]}>${total}/month</Text>
          </View>

          <Field
            label='Message (optional)'
            value={form.message}
            onChangeText={(t) => setForm((f) => ({ ...f, message: t }))}
            placeholder='Anything else we should know?'
            multiline
            numberOfLines={3}
            style={{ height: undefined }}
          />

          {!!error && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{error}</Text>}
          <Button label='Request upgrade' loading={loading} onPress={handleRequest} />
        </ScrollView>
      )}
    </View>
  )
}

function Stepper({ icon, onPress }) {
  const { colors, radius } = useTheme()
  return (
    <View
      onTouchEnd={onPress}
      style={{ width: 30, height: 30, borderRadius: radius.full, backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon}
    </View>
  )
}
