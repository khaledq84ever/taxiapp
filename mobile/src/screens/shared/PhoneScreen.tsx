import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

export default function PhoneScreen({ navigation }: any) {
  const [phone, setPhone] = useState('+966');
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((s: RootState) => s.auth);

  const handleSend = async () => {
    if (phone.length < 10) return Alert.alert('Error', 'Enter a valid phone number');
    try {
      await dispatch(sendOtp(phone)).unwrap();
      navigation.navigate('OTP', { phone });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send OTP');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to TaxiApp</Text>
      <Text style={styles.subtitle}>Enter your phone number to continue</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="+966501234567"
      />
      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 18, marginBottom: 16 },
  button: { backgroundColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center' },
  btnText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
});
