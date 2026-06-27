import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { setUser } from '../../store/slices/authSlice';
import { driversApi, usersApi } from '../../services/api';

const CAR_MAKES = ['Toyota', 'Hyundai', 'Kia', 'Nissan', 'Honda', 'Ford', 'BMW', 'Mercedes'];
const CAR_COLORS = ['White', 'Black', 'Silver', 'Gray', 'Blue', 'Red'];

export default function DriverRegisterScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);

  const [phone, setPhone] = useState(user?.phone?.startsWith('+guest') ? '+966' : (user?.phone ?? '+966'));
  const [name, setName] = useState(user?.name === 'Guest' ? '' : (user?.name ?? ''));
  const [form, setForm] = useState({
    licenseNumber: '', carMake: '', carModel: '', carYear: '', carColor: '', carPlate: '',
  });
  const [loading, setLoading] = useState(false);

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!phone || phone.length < 8) return Alert.alert('Phone Required', 'Enter your phone number');
    for (const [k, v] of Object.entries(form)) {
      if (!v) return Alert.alert('Missing Info', `Please fill in: ${k.replace(/([A-Z])/g, ' $1').trim()}`);
    }
    if (form.carYear.length !== 4) return Alert.alert('Invalid Year', 'Enter a 4-digit year (e.g. 2022)');
    setLoading(true);
    try {
      // Update profile with real phone + name first
      await usersApi.updateProfile({ phone, name: name || 'Driver' });
      // Register as driver (backend sets role → DRIVER)
      const res = await driversApi.register({ ...form, carYear: parseInt(form.carYear) });
      // Update Redux so navigator switches to driver stack
      dispatch(setUser({ ...user, role: 'DRIVER', phone, name: name || 'Driver' }));
      Alert.alert('🎉 Application Submitted!', 'Under review — usually approved within 24 hours.');
      navigation.navigate('PendingApproval');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>🚗💰</Text>
          <Text style={styles.heroTitle}>Start Earning Today</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>80%</Text>
              <Text style={styles.statLbl}>Your cut</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxHighlight]}>
              <Text style={[styles.statVal, { color: '#FFD700' }]}>280 SAR</Text>
              <Text style={[styles.statLbl, { color: '#aaa' }]}>Avg/day</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>Anytime</Text>
              <Text style={styles.statLbl}>Your hours</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Your Information</Text>

        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mohammed Al-Zahrani"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="+966501234567"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>Vehicle Information</Text>

        {/* License Number */}
        <Text style={styles.label}>License Number *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 12345678"
          value={form.licenseNumber}
          onChangeText={set('licenseNumber')}
          keyboardType="number-pad"
        />

        {/* Car Make — quick selector */}
        <Text style={styles.label}>Car Brand *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow} contentContainerStyle={{ gap: 8 }}>
          {CAR_MAKES.map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chip, form.carMake === m && styles.chipActive]}
              onPress={() => set('carMake')(m)}
            >
              <Text style={[styles.chipText, form.carMake === m && styles.chipTextActive]}>{m}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TextInput
          style={[styles.input, { marginTop: 8 }]}
          placeholder="Or type your car brand"
          value={form.carMake}
          onChangeText={set('carMake')}
        />

        <Text style={styles.label}>Car Model *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Camry, Elantra, Sunny"
          value={form.carModel}
          onChangeText={set('carModel')}
        />

        <Text style={styles.label}>Car Year *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2022"
          value={form.carYear}
          onChangeText={set('carYear')}
          keyboardType="number-pad"
          maxLength={4}
        />

        {/* Color — quick selector */}
        <Text style={styles.label}>Car Color *</Text>
        <View style={styles.colorRow}>
          {CAR_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, form.carColor === c && styles.chipActive]}
              onPress={() => set('carColor')(c)}
            >
              <Text style={[styles.chipText, form.carColor === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Plate Number *</Text>
        <TextInput
          style={[styles.input, styles.plateInput]}
          placeholder="e.g. ABC-1234"
          value={form.carPlate}
          onChangeText={(v) => set('carPlate')(v.toUpperCase())}
          autoCapitalize="characters"
        />

        {/* What happens next */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>What happens next?</Text>
          {[
            { icon: '✅', text: 'Submit your application now' },
            { icon: '🔍', text: 'We review your details (24h)' },
            { icon: '🚗', text: 'Get approved & start earning!' },
          ].map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{s.icon}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#1a1a2e" />
            : <Text style={styles.btnText}>Submit Application →</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>By applying you agree to our driver terms & privacy policy</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  hero: {
    backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20,
    alignItems: 'center', marginBottom: 28,
  },
  heroEmoji: { fontSize: 44, marginBottom: 8 },
  heroTitle: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginBottom: 16 },
  statsRow: { flexDirection: 'row', gap: 8, width: '100%' },
  statBox: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  statBoxHighlight: { backgroundColor: '#FFD70020', borderWidth: 1, borderColor: '#FFD70044' },
  statVal: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 3 },
  statLbl: { color: '#666', fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },

  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a2e', marginBottom: 16 },

  label: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14,
    padding: 14, marginBottom: 14, fontSize: 15, color: '#1a1a2e', backgroundColor: '#fafafa',
  },
  plateInput: {
    letterSpacing: 2, fontSize: 18, fontWeight: '700', textAlign: 'center',
    borderColor: '#FFD700', backgroundColor: '#FFFDE7',
  },

  chipRow: { marginBottom: 4 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e5e5e5', backgroundColor: '#f8f8f8',
  },
  chipActive: { borderColor: '#1a1a2e', backgroundColor: '#1a1a2e' },
  chipText: { color: '#666', fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#FFD700' },

  stepsCard: {
    backgroundColor: '#f8f8f8', borderRadius: 16, padding: 18,
    marginBottom: 20, marginTop: 8, borderWidth: 1, borderColor: '#e5e5e5',
  },
  stepsTitle: { color: '#888', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  stepIcon: { fontSize: 18, width: 28 },
  stepText: { color: '#1a1a2e', fontSize: 14, fontWeight: '500' },

  button: {
    backgroundColor: '#FFD700', borderRadius: 16, padding: 18,
    alignItems: 'center', marginBottom: 14,
  },
  btnText: { color: '#1a1a2e', fontWeight: '900', fontSize: 17 },
  note: { color: '#bbb', fontSize: 12, textAlign: 'center' },
});
