import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { estimateFare, requestTrip } from '../../store/slices/tripSlice';
import { AppDispatch, RootState } from '../../store';

export default function BookRideScreen({ navigation, route }: any) {
  const { location } = route.params;
  const dispatch = useDispatch<AppDispatch>();
  const { fareEstimate, loading } = useSelector((s: RootState) => s.trip);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');

  const handleEstimate = async () => {
    if (!dropoffAddress) return Alert.alert('Error', 'Enter a destination');
    await dispatch(estimateFare({
      pickupLat: location.latitude, pickupLng: location.longitude,
      dropoffLat: location.latitude + 0.05, dropoffLng: location.longitude + 0.05,
    }));
  };

  const handleBook = async () => {
    try {
      await dispatch(requestTrip({
        pickupAddress: 'Current Location',
        pickupLat: location.latitude, pickupLng: location.longitude,
        dropoffAddress,
        dropoffLat: location.latitude + 0.05, dropoffLng: location.longitude + 0.05,
        paymentMethod,
      })).unwrap();
      navigation.navigate('FindingDriver');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not book ride');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Book a Ride</Text>

      <Text style={styles.label}>Pickup</Text>
      <View style={styles.inputDisabled}><Text>📍 Current Location</Text></View>

      <Text style={styles.label}>Destination</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter destination address"
        value={dropoffAddress}
        onChangeText={setDropoffAddress}
      />

      <Text style={styles.label}>Payment Method</Text>
      <View style={styles.paymentRow}>
        {(['CASH', 'CARD'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]}
            onPress={() => setPaymentMethod(method)}
          >
            <Text style={paymentMethod === method ? styles.paymentTextActive : styles.paymentText}>
              {method === 'CASH' ? '💵 Cash' : '💳 Card'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {fareEstimate && (
        <View style={styles.estimateBox}>
          <Text style={styles.estimateText}>Estimated Fare: {fareEstimate.estimatedFare} SAR</Text>
          <Text style={styles.estimateSubText}>Distance: {fareEstimate.distanceKm} km</Text>
        </View>
      )}

      <TouchableOpacity style={styles.estimateBtn} onPress={handleEstimate}>
        <Text style={styles.btnText}>Get Estimate</Text>
      </TouchableOpacity>

      {fareEstimate && (
        <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={loading}>
          {loading ? <ActivityIndicator color="#1a1a2e" /> : <Text style={styles.bookText}>Book Now</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 24 },
  label: { fontSize: 14, color: '#666', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 16, fontSize: 16 },
  inputDisabled: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, marginBottom: 16, backgroundColor: '#f9f9f9' },
  paymentRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  paymentBtn: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 14, alignItems: 'center' },
  paymentBtnActive: { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  paymentText: { color: '#666' },
  paymentTextActive: { color: '#1a1a2e', fontWeight: 'bold' },
  estimateBox: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 16 },
  estimateText: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  estimateSubText: { color: '#666', marginTop: 4 },
  estimateBtn: { borderWidth: 1, borderColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  bookBtn: { backgroundColor: '#FFD700', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 32 },
  btnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
  bookText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 18 },
});
