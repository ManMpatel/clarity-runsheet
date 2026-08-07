import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

const TIER_LABELS = { entry: 'Entry', mid: 'Mid', top: 'Top', locked: 'Not yet active' }

export default function MyPlanScreen() {
  const [company, setCompany]   = useState(null)
  const [vehicleCount, setVehicleCount] = useState(0)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [cRes, vRes] = await Promise.all([
        api.get('/api/settings/company'),
        api.get('/api/vehicles'),
      ])
      setCompany(cRes.data)
      setVehicleCount((vRes.data || []).length)
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load plan details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load plan</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  const slots = company?.slots || { entrySlots: 0, midSlots: 0, topSlots: 0 }
  const totalSlots = (slots.entrySlots || 0) + (slots.midSlots || 0) + (slots.topSlots || 0)

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.planLabel}>CURRENT PLAN</Text>
        <Text style={styles.planName}>{TIER_LABELS[company?.subscriptionTier] || company?.subscriptionTier || '--'}</Text>

        <View style={styles.divider} />

        <Text style={styles.planLabel}>VEHICLE SLOTS</Text>
        <Text style={styles.slotValue}>{vehicleCount} of {totalSlots || '0'} used</Text>

        <View style={styles.divider} />

        <Text style={styles.planLabel}>BREAKDOWN</Text>
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownText}>Entry: {slots.entrySlots || 0}</Text>
          <Text style={styles.breakdownText}>Mid: {slots.midSlots || 0}</Text>
          <Text style={styles.breakdownText}>Top: {slots.topSlots || 0}</Text>
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.margin },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.md },
  planLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 4 },
  planName:  { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  divider:   { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  slotValue: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  breakdownRow: { flexDirection: 'row', gap: spacing.md },
  breakdownText: { fontSize: 13, color: colors.textPrimary },
})