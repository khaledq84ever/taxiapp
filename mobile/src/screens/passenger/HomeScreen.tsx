import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';

export default function PassengerHomeScreen({ navigation }: any) {
  const { user } = useSelector((s: RootState) => s.auth);
  const [location, setLocation] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
        >
          <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} title="You" />
        </MapView>
      )}
      <View style={styles.panel}>
        <Text style={styles.greeting}>Hello, {user?.name || 'Passenger'} 👋</Text>
        <Text style={styles.subtitle}>Where do you want to go?</Text>
        <TouchableOpacity style={styles.searchBox} onPress={() => navigation.navigate('BookRide', { location })}>
          <Text style={styles.searchText}>🔍  Enter destination...</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.historyBtn} onPress={() => navigation.navigate('TripHistory')}>
          <Text style={styles.historyText}>View Trip History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  panel: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 10 },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
  subtitle: { color: '#666', marginBottom: 16 },
  searchBox: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 12 },
  searchText: { color: '#999', fontSize: 16 },
  historyBtn: { alignItems: 'center', padding: 12 },
  historyText: { color: '#FFD700', fontWeight: 'bold' },
});
