import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { cancelTrip } from '../../store/slices/tripSlice';
import { AppDispatch, RootState } from '../../store';

export default function FindingDriverScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { currentTrip } = useSelector((s: RootState) => s.trip);

  useEffect(() => {
    if (currentTrip?.status === 'ACCEPTED') {
      navigation.navigate('TrackDriver');
    }
  }, [currentTrip?.status]);

  const handleCancel = async () => {
    if (currentTrip) {
      await dispatch(cancelTrip({ id: currentTrip.id, reason: 'Cancelled by passenger' }));
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFD700" />
      <Text style={styles.title}>Finding your driver...</Text>
      <Text style={styles.subtitle}>This usually takes 1-3 minutes</Text>
      <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginTop: 24, marginBottom: 8 },
  subtitle: { color: '#666', marginBottom: 48 },
  cancelBtn: { borderWidth: 1, borderColor: '#ff4444', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  cancelText: { color: '#ff4444', fontWeight: 'bold', fontSize: 16 },
});
