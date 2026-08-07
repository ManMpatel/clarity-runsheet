import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Switch, Linking, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import api from '../lib/api'
import { colors, radius, spacing } from '../lib/theme'

function sinceLabel(ts) {
  if (!ts) return null
  const mins = Math.round((Date.now() - ts) / 60000)
  if (mins < 1)  return '< 1 min'
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function VehicleCard({ vehicle, onClose }) {
  const [cutting, setCutting] = useState(false)
  const [immobilised, setImmobilised] = useState(vehicle.immobilised || false)

  const isMoving = (vehicle.speed || 0) > 0

  async function toggleEngine() {
    if (isMoving) return
    setCutting(true)
    try {
      const action = immobilised ? 'restore' : 'cut'
      await api.post(`/vehicles/${vehicle.id}/${action}`)
      setImmobilised(!immobilised)
    } catch (err) {
      Alert.alert('Could not change engine power', err.response?.data?.error || 'Try again')
    } finally {
      setCutting(false)
    }
  }

  function navigate() {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${vehicle.latitude},${vehicle.longitude}`
    Linking.openURL(url)
  }

  return (
    <View style={styles.card}>
      <View style={styles.handle} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={[styles.dot, { backgroundColor: isMoving ? colors.success : vehicle.ignition ? colors.warning : colors.placeholder }]} />
          <Text style={styles.title}>{vehicle.name}</Text>
        </View>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name='close' size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {vehicle.address ? (
        <Text style={styles.address}>📍 {vehicle.address}</Text>
      ) : null}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>SPEED</Text>
          <Text style={styles.statValue}>{vehicle.speed || 0} km/h</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>STATUS</Text>
          <Text style={[styles.statValue, { color: isMoving ? colors.success : colors.textPrimary }]}>
            {isMoving ? 'Moving' : vehicle.ignition ? 'Idling' : 'Stopped'}
          </Text>
        </View>
        {vehicle.todayKm != null && (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>{vehicle.todayKm} km</Text>
          </View>
        )}
        {vehicle.stateChangedAt ? (
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>SINCE</Text>
            <Text style={styles.statValue}>{sinceLabel(vehicle.stateChangedAt)}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.engineRow, isMoving && styles.engineRowDisabled]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.engineTitle}>Engine Power</Text>
          <Text style={styles.engineSub}>{isMoving ? 'Stop vehicle to change' : 'Immobilise vehicle'}</Text>
        </View>
        <Switch
          value={immobilised}
          onValueChange={toggleEngine}
          disabled={isMoving || cutting}
          trackColor={{ false: '#d1d5db', true: colors.error }}
        />
      </View>

      <TouchableOpacity style={styles.navBtn} onPress={navigate}>
        <MaterialIcons name='directions' size={18} color={colors.onPrimary} />
        <Text style={styles.navBtnText}>Navigate to Vehicle</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
    padding: spacing.md, paddingBottom: spacing.lg,
  },
  handle:  { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.sm },
  address: { fontSize: 12, color: colors.textSecondary, marginBottom: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  title: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statBox: { flex: 1, backgroundColor: colors.background, borderRadius: radius.sm, padding: spacing.sm },
  statLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '600', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  engineRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md,
  },
  engineRowDisabled: { opacity: 0.6 },
  engineTitle: { fontSize: 13, fontWeight: '600', color: colors.error },
  engineSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  navBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 50, backgroundColor: colors.primary, borderRadius: radius.md,
  },
  navBtnText: { color: colors.onPrimary, fontSize: 14, fontWeight: '600' },
})