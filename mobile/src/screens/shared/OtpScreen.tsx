import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { verifyOtp } from '../../store/slices/authSlice';
import { AppDispatch, RootState } from '../../store';

export default function OtpScreen({ navigation, route }: any) {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((s: RootState) => s.auth);

  const handleVerify = async () => {
    if (code.length !== 6) return Alert.alert('Error', 'Enter the 6-digit code');
    try {
      const result = await dispatch(verifyOtp({ phone, code })).unwrap();
      if (result.user.role === 'DRIVER') {
        navigation.reset({ index: 0, routes: [{ name: 'DriverHome' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'PassengerHome' }] });
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Invalid OTP');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter Code</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {phone}</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        textAlign="center"
      />
      <TouchableOpacity style={styles.button} onPress={handleVerify} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Change number</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 32, letterSpacing: 8, marginBottom: 16 },
  button: { backgroundColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 },
  btnText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  link: { textAlign: 'center', color: '#666', textDecorationLine: 'underline' },
});
