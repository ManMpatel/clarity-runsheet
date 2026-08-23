import { useEffect, useState } from 'react'
import { View, Text, ScrollView } from 'react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Card, Field, Button, Switch } from '../../components/ui'

const TOGGLES = [
  { key: 'speeding', label: 'Speeding alerts', desc: 'Fires when a van exceeds your speed limit' },
  { key: 'afterHours', label: 'After-hours movement', desc: 'Fires when ignition is on outside business hours' },
  { key: 'geofenceBreach', label: 'Geofence alerts', desc: 'Fires when a van enters or exits a zone — set which per zone in Geofences' },
  { key: 'tamper', label: 'Theft & tamper alerts', desc: 'Fires when the tracker is unplugged or loses power' },
]

const ALWAYS_ON = [
  { label: 'Engine fault alerts', desc: 'Always on — fires when OBD detects a fault code' },
  { label: 'Low battery alerts', desc: 'Always on — fires when voltage drops below threshold' },
  { label: 'Towing detection', desc: 'Always on — fires when van moves with ignition off' },
  { label: 'Crash detection', desc: 'Always on — fires on accelerometer impact event' },
]

export default function AlertRulesScreen({ navigation }) {
  const { colors, space, type } = useTheme()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    speeding: true,
    afterHours: true,
    geofenceBreach: true,
    tamper: true,
    speedLimit: 110,
    voltageThreshold: 11.5,
    smsNumber: '',
  })

  useEffect(() => {
    api.get('/alerts/preferences').then((res) => {
      const r = res.data || []
      const s = r.find((x) => x.type === 'speeding')
      const a = r.find((x) => x.type === 'afterHours')
      const b = r.find((x) => x.type === 'lowBattery')
      const g = r.find((x) => x.type === 'geofenceBreach')
      const t = r.find((x) => x.type === 'tamper')
      if (s || a || b || g || t) {
        setForm({
          speeding: s?.active ?? true,
          afterHours: a?.active ?? true,
          geofenceBreach: g?.active ?? true,
          tamper: t?.active ?? true,
          speedLimit: s?.speedLimit || 110,
          voltageThreshold: Number(b?.voltageThreshold) || 11.5,
          smsNumber: s?.smsNumber || '',
        })
      }
    }).catch(() => {})
  }, [])

  async function handleSave() {
    setError('')
    setSaving(true)
    try {
      await api.post('/alerts/preferences', form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save alert rules')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Alert rules' onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}>
        <Text style={[type.body, { color: colors.fgMuted, marginBottom: space.lg }]}>
          Control which events trigger alerts for your fleet
        </Text>

        <Card padded={false} style={{ marginBottom: space.lg }}>
          {TOGGLES.map((row, i) => (
            <View key={row.key}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md }}>
                <View style={{ flex: 1, marginRight: space.md }}>
                  <Text style={[type.bodyMedium, { color: colors.fg }]}>{row.label}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{row.desc}</Text>
                </View>
                <Switch value={!!form[row.key]} onValueChange={(v) => setForm((f) => ({ ...f, [row.key]: v }))} />
              </View>
              {i < TOGGLES.length + ALWAYS_ON.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: space.md }} />}
            </View>
          ))}
          {ALWAYS_ON.map((row, i) => (
            <View key={row.label}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: space.md }}>
                <View style={{ flex: 1, marginRight: space.md }}>
                  <Text style={[type.bodyMedium, { color: colors.fg }]}>{row.label}</Text>
                  <Text style={[type.caption, { color: colors.fgMuted, marginTop: 2 }]}>{row.desc}</Text>
                </View>
                <Text style={[type.captionMedium, { color: colors.success }]}>Always on</Text>
              </View>
              {i < ALWAYS_ON.length - 1 && <View style={{ height: 1, backgroundColor: colors.border, marginLeft: space.md }} />}
            </View>
          ))}
        </Card>

        <Text style={[type.captionMedium, { color: colors.fgSubtle, marginBottom: space.sm, textTransform: 'uppercase', letterSpacing: 0.4 }]}>
          Thresholds
        </Text>
        <Field
          label='Speed limit (km/h)'
          helperText='Alert fires when any van exceeds this speed'
          value={String(form.speedLimit)}
          onChangeText={(t) => setForm((f) => ({ ...f, speedLimit: parseInt(t, 10) || 110 }))}
          keyboardType='number-pad'
        />
        <Field
          label='Low battery threshold (volts)'
          helperText='Alert fires when external voltage drops below this'
          value={String(form.voltageThreshold)}
          onChangeText={(t) => setForm((f) => ({ ...f, voltageThreshold: parseFloat(t) || 11.5 }))}
          keyboardType='decimal-pad'
        />
        <Field
          label='SMS number for critical alerts (optional)'
          helperText='Crash and towing alerts will SMS this number'
          value={form.smsNumber}
          onChangeText={(t) => setForm((f) => ({ ...f, smsNumber: t }))}
          keyboardType='phone-pad'
          placeholder='+61400000000'
        />

        {!!error && <Text style={[type.caption, { color: colors.danger, marginBottom: space.sm }]}>{error}</Text>}
        <Button label={saved ? 'Saved' : 'Save alert rules'} loading={saving} onPress={handleSave} />
      </ScrollView>
    </View>
  )
}
