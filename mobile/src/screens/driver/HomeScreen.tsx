import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { driversApi } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function DriverHomeScreen({ navigation }: any) {
  const { user } = useSelector((s: RootState) => s.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);

      const driver = await driversApi.getStatus();
      setIsOnline(driver.data.isOnline);
      setEarnings(driver.data.totalEarnings);
    })();
  }, []);

  useEffect(() => {
    if (!isOnline || !location) return;
    const interval = setInterval(async () => {
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      await driversApi.updateLocation(loc.coords.latitude, loc.coords.longitude);
    }, 5000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const handleToggleOnline = async (value: boolean) => {
    try {
      await driversApi.toggleOnline(value);
      setIsOnline(value);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Cannot go online');
    }
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude, longitude: location.longitude,
            latitudeDelta: 0.01, longitudeDelta: 0.01,
          }}
          showsUserLocation
        />
      )}
      <View style={styles.panel}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.name}>{user?.name || 'Driver'}</Text>
            <Text style={[styles.status, isOnline && styles.statusOnline]}>
              {isOnline ? '🟢 Online' : '🔴 Offline'}
            </Text>
          </View>
          <Switch value={isOnline} onValueChange={handleToggleOnline} trackColor={{ true: '#4CAF50' }} />
        </View>
        <View style={styles.earningsBox}>
          <Text style={styles.earningsLabel}>Today's Earnings</Text>
          <Text style={styles.earningsValue}>{earnings.toFixed(2)} SAR</Text>
        </View>
        <TouchableOpacity style={styles.earningsBtn} onPress={() => navigation.navigate('DriverEarnings')}>
          <Text style={styles.earningsBtnText}>View Full Earnings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  status: { color: '#999', marginTop: 4 },
  statusOnline: { color: '#4CAF50' },
  earningsBox: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  earningsLabel: { color: '#666' },
  earningsValue: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginTop: 4 },
  earningsBtn: { alignItems: 'center', padding: 12 },
  earningsBtnText: { color: '#FFD700', fontWeight: 'bold' },
});
