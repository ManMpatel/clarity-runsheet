import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

const PLANS = [
  { key: 'entrySlots', name: 'Entry', price: 18 },
  { key: 'midSlots',   name: 'Mid',   price: 25 },
  { key: 'topSlots',   name: 'Top',   price: 45 },
]

export default function UpgradeScreen() {
  const [form, setForm] = useState({ entrySlots: 0, midSlots: 0, topSlots: 0, message: '' })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function adjust(key, delta) {
    setForm(f => ({ ...f, [key]: Math.max(0, f[key] + delta) }))
  }

  async function handleRequest() {
    if (!form.entrySlots && !form.midSlots && !form.topSlots) {
      setError('Please select at least one plan slot')
      return
    }
    setError('')
    setLoading(true)
    try {
      await api.post('/upgrade/request', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <View style={styles.center}>
        <Text style={styles.successTitle}>Request sent</Text>
        <Text style={styles.successSub}>We'll be in touch shortly to set up your new plan.</Text>
      </View>
    )
  }

  const total = PLANS.reduce((sum, p) => sum + form[p.key] * p.price, 0)

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Choose the right plan for your fleet</Text>

      {PLANS.map(p => (
        <View key={p.key} style={styles.planRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.planName}>{p.name}</Text>
            <Text style={styles.planPrice}>${p.price}/van/month</Text>
          </View>
          <View style={styles.stepper}>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjust(p.key, -1)}>
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{form[p.key]}</Text>
            <TouchableOpacity style={styles.stepperBtn} onPress={() => adjust(p.key, 1)}>
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Estimated total</Text>
        <Text style={styles.totalValue}>${total}/month</Text>
      </View>

      <Text style={styles.label}>Message (optional)</Text>
      <TextInput
        style={styles.textarea}
        value={form.message}
        onChangeText={t => setForm(f => ({ ...f, message: t }))}
        placeholder='Anything else we should know?'
        placeholderTextColor={colors.placeholder}
        multiline
        numberOfLines={3}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity style={styles.requestBtn} onPress={handleRequest} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.requestBtnText}>Request upgrade</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.margin, paddingBottom: spacing.lg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: spacing.lg },
  title:   { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.lg },
  planRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.sm },
  planName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  planPrice:{ fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  stepper:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { fontSize: 16, color: colors.textPrimary, fontWeight: '700' },
  stepperValue: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing.sm, marginBottom: spacing.md },
  totalLabel: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: 16, color: colors.textPrimary, fontWeight: '700' },
  label:   { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  textarea:{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.surface, minHeight: 80, textAlignVertical: 'top', marginBottom: spacing.md },
  error:   { color: colors.error, fontSize: 12, marginBottom: spacing.sm },
  requestBtn: { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  requestBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
  successTitle: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  successSub: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
})
