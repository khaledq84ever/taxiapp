import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { driversApi } from '../../services/api';

export default function DriverRegisterScreen({ navigation }: any) {
  const [form, setForm] = useState({
    licenseNumber: '', carMake: '', carModel: '', carYear: '', carColor: '', carPlate: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    for (const [k, v] of Object.entries(form)) {
      if (!v) return Alert.alert('Error', `Please fill in ${k}`);
    }
    setLoading(true);
    try {
      await driversApi.register({ ...form, carYear: parseInt(form.carYear) });
      Alert.alert('Submitted!', 'Your application is under review. We will notify you once approved.');
      navigation.navigate('PendingApproval');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'licenseNumber', label: 'License Number', placeholder: 'e.g. 12345678' },
    { key: 'carMake', label: 'Car Brand', placeholder: 'e.g. Toyota' },
    { key: 'carModel', label: 'Car Model', placeholder: 'e.g. Camry' },
    { key: 'carYear', label: 'Car Year', placeholder: 'e.g. 2022', keyboard: 'number-pad' },
    { key: 'carColor', label: 'Car Color', placeholder: 'e.g. White' },
    { key: 'carPlate', label: 'Plate Number', placeholder: 'e.g. ABC-1234' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Driver Registration</Text>
      <Text style={styles.subtitle}>Fill in your vehicle details to apply</Text>

      {fields.map((f) => (
        <View key={f.key}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={styles.input}
            placeholder={f.placeholder}
            value={form[f.key as keyof typeof form]}
            onChangeText={set(f.key)}
            keyboardType={f.keyboard as any || 'default'}
          />
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.btnText}>Submit Application</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8, marginTop: 20 },
  subtitle: { color: '#666', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 40 },
  btnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 18 },
});
