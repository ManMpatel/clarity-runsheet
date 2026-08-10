import { useEffect, useState } from 'react'
import { ScrollView, View, Alert } from 'react-native'
import api from '../../lib/api'
import { useTheme } from '../../theme'
import { Header, Field, Button, Skeleton, ErrorState } from '../../components/ui'

const FIELDS = [
  { key: 'name', label: 'Company name', placeholder: 'Acme Logistics' },
  { key: 'abn', label: 'ABN', placeholder: '12 345 678 910' },
  { key: 'phone', label: 'Phone', placeholder: '+61 412 345 678' },
  { key: 'address', label: 'Address', placeholder: '184 Industrial Avenue, Silverwater NSW 2128' },
  { key: 'timezone', label: 'Timezone', placeholder: 'Australia/Sydney' },
  { key: 'website', label: 'Website', placeholder: 'www.acmelogistics.com.au' },
]

export default function CompanyScreen({ navigation }) {
  const { colors, space } = useTheme()
  const [form, setForm] = useState({ name: '', abn: '', phone: '', address: '', timezone: '', website: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/settings/company')
      setForm({
        name: res.data.name || '', abn: res.data.abn || '', phone: res.data.phone || '',
        address: res.data.address || '', timezone: res.data.timezone || '', website: res.data.website || '',
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load company details')
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      await api.put('/settings/company', form)
      Alert.alert('Saved', 'Company details updated')
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Header title='Company' onBack={() => navigation.goBack()} />
      {loading ? (
        <View style={{ padding: space.lg }}><Skeleton height={300} radius={16} /></View>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: space['4xl'] }}>
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} placeholder={f.placeholder} value={form[f.key]} onChangeText={(t) => setForm((s) => ({ ...s, [f.key]: t }))} />
          ))}
          <Button label='Save changes' loading={saving} onPress={save} />
        </ScrollView>
      )}
    </View>
  )
}
