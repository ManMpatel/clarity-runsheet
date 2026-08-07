import { useEffect, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native'
import api from '../../lib/api'
import { colors, radius, spacing } from '../../lib/theme'

export default function CompanyScreen() {
  const [form, setForm]       = useState({ name: '', abn: '', phone: '', address: '', timezone: '', website: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [saving, setSaving]   = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const res = await api.get('/settings/company')
      setForm({
        name:     res.data.name || '',
        abn:      res.data.abn || '',
        phone:    res.data.phone || '',
        address:  res.data.address || '',
        timezone: res.data.timezone || '',
        website:  res.data.website || '',
      })
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load company details')
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
      Alert.alert('Error', err.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size='large' color={colors.primary} /></View>
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Couldn't load company details</Text>
        <Text style={styles.errorSub}>{error}</Text>
      </View>
    )
  }

  const fields = [
    { key: 'name',     label: 'Company Name', placeholder: 'Acme Logistics' },
    { key: 'abn',      label: 'ABN',          placeholder: '12 345 678 910' },
    { key: 'phone',    label: 'Phone',        placeholder: '+61 412 345 678' },
    { key: 'address',  label: 'Address',      placeholder: '184 Industrial Avenue, Silverwater NSW 2128' },
    { key: 'timezone', label: 'Timezone',     placeholder: 'Australia/Sydney' },
    { key: 'website',  label: 'Website',      placeholder: 'www.acmelogistics.com.au' },
  ]

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Company Details</Text>
      <Text style={styles.subtitle}>Update your organisation's core information.</Text>

      {fields.map(f => (
        <View key={f.key}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            value={form[f.key]}
            onChangeText={t => setForm(s => ({ ...s, [f.key]: t }))}
            placeholder={f.placeholder}
            placeholderTextColor={colors.placeholder}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
        {saving ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  page:    { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.margin, paddingBottom: spacing.lg },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  errorTitle: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 6 },
  errorSub:   { fontSize: 13, color: colors.textSecondary, textAlign: 'center', paddingHorizontal: 24 },
  title:    { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginBottom: spacing.lg },
  label:    { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: spacing.sm },
  input:    { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.surface },
  saveBtn:  { height: 52, backgroundColor: colors.primary, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  saveBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '600' },
})