import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function DriverFoundScreen({ navigation }: any) {
  const { currentTrip, driverInfo } = useSelector((s: RootState) => s.trip);
  const driver = driverInfo || {};
  const user = driver.user || {};
  const [eta, setEta] = useState<number | null>(null);

  useEffect(() => {
    // Listen for first location update to get real ETA
    const { socketService } = require('../../services/socket');
    const onLocation = (data: any) => { if (data.etaMinutes) setEta(data.etaMinutes); };
    socketService.on('server:driver-location', onLocation);
    const timer = setTimeout(() => navigation.replace('TrackDriver'), 5000);
    return () => {
      clearTimeout(timer);
      socketService.off('server:driver-location', onLocation);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkEmoji}>✅</Text>
        </View>
        <Text style={styles.found}>Driver Found!</Text>
        <Text style={styles.eta}>Arriving in ~{eta ?? '...'} min</Text>

        <View style={styles.driverCard}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>🚗</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{user.name || 'Your Driver'}</Text>
              <View style={styles.ratingRow}>
                <Text style={styles.star}>⭐</Text>
                <Text style={styles.rating}>{driver.rating?.toFixed(1) ?? '4.8'}</Text>
                <Text style={styles.ratingCount}>• Verified Driver</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.carRow}>
            <View style={styles.carDetail}>
              <Text style={styles.carLabel}>Car</Text>
              <Text style={styles.carValue}>
                {driver.carMake} {driver.carModel}
              </Text>
            </View>
            <View style={styles.carDetail}>
              <Text style={styles.carLabel}>Color</Text>
              <Text style={styles.carValue}>{driver.carColor || '—'}</Text>
            </View>
            <View style={styles.carDetail}>
              <Text style={styles.carLabel}>Plate</Text>
              <Text style={styles.carValue}>{driver.carPlate || '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.fareCard}>
          <Text style={styles.fareLabel}>Estimated Fare</Text>
          <Text style={styles.fareValue}>{currentTrip?.fareEstimate ?? '—'} SAR</Text>
        </View>

        <TouchableOpacity style={styles.trackBtn} onPress={() => navigation.replace('TrackDriver')}>
          <Text style={styles.trackBtnText}>Track Driver Now →</Text>
        </TouchableOpacity>

        <Text style={styles.autoText}>Auto-tracking in 5 seconds...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: { flex: 1, padding: 24, justifyContent: 'center' },

  checkCircle: {
    width: 100,
    height: 100,
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  checkEmoji: { fontSize: 52 },
  found: { fontSize: 28, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 6 },
  eta: { color: '#aaa', fontSize: 16, textAlign: 'center', marginBottom: 28 },

  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 14,
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 60,
    height: 60,
    backgroundColor: '#FFD700',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 30 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  star: { fontSize: 14 },
  rating: { fontWeight: 'bold', color: '#1a1a2e', fontSize: 14 },
  ratingCount: { color: '#888', fontSize: 13 },

  divider: { height: 1, backgroundColor: '#f0f0f0', marginBottom: 16 },

  carRow: { flexDirection: 'row', justifyContent: 'space-between' },
  carDetail: { alignItems: 'center' },
  carLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  carValue: { color: '#1a1a2e', fontWeight: '600', fontSize: 14, marginTop: 2 },

  fareCard: {
    backgroundColor: 'rgba(255,215,0,0.1)',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  fareLabel: { color: '#FFD700', fontSize: 15 },
  fareValue: { color: '#FFD700', fontSize: 22, fontWeight: 'bold' },

  trackBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  trackBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 17 },
  autoText: { color: '#555', textAlign: 'center', fontSize: 13 },
});
