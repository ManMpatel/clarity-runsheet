import { useEffect, useState } from 'react'
import { View, Text, Pressable } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Wrench, Plus, X, CheckCircle2, TriangleAlert, CalendarClock } from 'lucide-react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Chip, Badge, EmptyState, ErrorState, Skeleton } from '../../components/ui'

function statusInfo(record, colors) {
  if (record.status === 'completed') return { label: 'Completed', tone: 'neutral', icon: CheckCircle2, color: colors.fgMuted }
  if (!record.dueDate) return { label: 'Pending', tone: 'info', icon: CalendarClock, color: colors.info }
  const diff = new Date(record.dueDate) - new Date()
  if (diff < 0) return { label: 'Overdue', tone: 'danger', icon: TriangleAlert, color: colors.danger }
  if (diff < 7 * 24 * 60 * 60 * 1000) return { label: 'Due this week', tone: 'warning', icon: CalendarClock, color: colors.warning }
  return { label: 'Upcoming', tone: 'info', icon: CalendarClock, color: colors.info }
}

export default function MaintenanceScreen({ navigation }) {
  const { colors, space, radius, type } = useTheme()
  const [records, setRecords]   = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [showAdd, setShowAdd]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm]         = useState({ vehicleId: '', type: '', dueDate: '', notes: '' })
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [mRes, vRes] = await Promise.all([api.get('/maintenance'), api.get('/vehicles')])
      setRecords(mRes.data || [])
      setVehicles(vRes.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load maintenance records')
    } finally {
      setLoading(false)
    }
  }

  async function addRecord() {
    setFormError('')
    if (!form.vehicleId || !form.type) return setFormError('Vehicle and service type are required')
    setSaving(true)
    try {
      const res = await api.post('/maintenance', form, { headers: { 'Idempotency-Key': `${Date.now()}-${form.vehicleId}` } })
      setRecords((r) => [res.data, ...r])
      setForm({ vehicleId: '', type: '', dueDate: '', notes: '' })
      setShowAdd(false)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Could not add record')
    } finally {
      setSaving(false)
    }
  }

  async function completeRecord(id) {
    try {
      const res = await api.put(`/maintenance/${id}/complete`, { completedDate: new Date().toISOString() })
      setRecords((r) => r.map((rec) => (rec.id === id ? res.data : rec)))
    } catch (err) {
      console.log(err.message)
    }
  }

  function vehicleName(id) {
    return vehicles.find((v) => v.id === id)?.name || 'Vehicle'
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header
        title='Maintenance'
        onBack={() => navigation.goBack()}
        right={<Pressable onPress={() => setShowAdd((s) => !s)} hitSlop={8}>{showAdd ? <X size={20} color={colors.fg} /> : <Plus size={20} color={colors.fg} />}</Pressable>}
      />
      {showAdd && (
        <Card style={{ marginHorizontal: space.lg, marginBottom: space.md }}>
          {!!formError && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{formError}</Text>}
          <Text style={[type.captionMedium, { color: colors.fgMuted, marginBottom: space.xs }]}>Vehicle</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.md }}>
            {vehicles.map((v) => (
              <Chip key={v.id} label={v.name} active={form.vehicleId === v.id} onPress={() => setForm((f) => ({ ...f, vehicleId: v.id }))} />
            ))}
          </View>
          <Field placeholder='Service type (e.g. Oil change)' value={form.type} onChangeText={(t) => setForm((f) => ({ ...f, type: t }))} />
          <Field placeholder='Due date (YYYY-MM-DD, optional)' value={form.dueDate} onChangeText={(t) => setForm((f) => ({ ...f, dueDate: t }))} />
          <Field placeholder='Notes (optional)' value={form.notes} onChangeText={(t) => setForm((f) => ({ ...f, notes: t }))} style={{ marginBottom: 0 }} />
          <Button label='Save record' loading={saving} onPress={addRecord} style={{ marginTop: space.md }} />
        </Card>
      )}

      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={72} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <FlashList
          data={records}
          keyExtractor={(item) => item.id}
          estimatedItemSize={84}
          contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}
          ListEmptyComponent={!showAdd && <EmptyState icon={<Wrench size={36} color={colors.fgSubtle} />} title='No maintenance records yet' message='Tap + to schedule your first service' />}
          renderItem={({ item }) => {
            const status = statusInfo(item, colors)
            return (
              <Pressable onPress={() => item.status === 'pending' && completeRecord(item.id)} style={{ marginBottom: space.sm }}>
                <Card style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 36, height: 36, borderRadius: radius.sm, backgroundColor: status.color + '1A', alignItems: 'center', justifyContent: 'center', marginRight: space.md }}>
                    <status.icon size={17} color={status.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.bodySemibold, { color: colors.fg }]}>{vehicleName(item.vehicleId)}</Text>
                    <Text style={[type.caption, { color: colors.fg, marginTop: 2 }]}>{item.type}</Text>
                    <Text style={[type.micro, { color: colors.fgMuted, marginTop: 2 }]}>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No date set'}</Text>
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </Card>
              </Pressable>
            )
          }}
        />
      )}
    </View>
  )
}
