import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { driversApi, notificationsApi } from '../../services/api';
import { setNearbyDrivers } from '../../store/slices/tripSlice';

export default function PassengerHomeScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [location, setLocation] = useState<any>(null);
  const [nearbyDrivers, setNearbyDriversLocal] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    notificationsApi.getUnreadCount().then((res) => setUnreadCount(res.data.count)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.getUnreadCount().then((res) => setUnreadCount(res.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Fetch nearby drivers every 15 seconds once we have location
  useEffect(() => {
    if (!location) return;

    const fetch = async () => {
      try {
        const res = await driversApi.getNearby(location.latitude, location.longitude);
        const drivers = res.data ?? [];
        setNearbyDriversLocal(drivers);
        dispatch(setNearbyDrivers(drivers));
      } catch {}
    };

    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, [location]);

  const driversCount = nearbyDrivers.length;

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Nearby driver car markers */}
          {nearbyDrivers.map((driver) =>
            driver.currentLat && driver.currentLng ? (
              <Marker
                key={driver.id}
                coordinate={{ latitude: driver.currentLat, longitude: driver.currentLng }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <View style={styles.carMarker}>
                  <Text style={styles.carMarkerText}>🚗</Text>
                </View>
              </Marker>
            ) : null,
          )}
        </MapView>
      )}

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        {driversCount > 0 && (
          <View style={styles.driversBadge}>
            <Text style={styles.driversBadgeText}>
              🚗 {driversCount} nearby
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Text style={styles.profileBtnText}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate('Profile')}
        >
          <Text style={styles.profileBtnText}>👤</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom panel */}
      <View style={styles.panel}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'} 👋</Text>
        <Text style={styles.subtitle}>Where do you want to go?</Text>

        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigation.navigate('BookRide', { location })}
          activeOpacity={0.8}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>Enter destination...</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => navigation.navigate('TripHistory')}
        >
          <Text style={styles.historyIcon}>📋</Text>
          <Text style={styles.historyText}>View Trip History</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  carMarker: {
    width: 38,
    height: 38,
    backgroundColor: '#fff',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#FFD700',
  },
  carMarkerText: { fontSize: 20 },

  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 10,
  },
  driversBadge: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  driversBadgeText: { color: '#FFD700', fontWeight: '700', fontSize: 13 },
  profileBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#1a1a2e',
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  profileBtnText: { fontSize: 20 },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  panel: {
    backgroundColor: '#fff',
    padding: 24,
    paddingBottom: 32,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4 },
  subtitle: { color: '#888', fontSize: 14, marginBottom: 18 },

  searchBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: { fontSize: 18 },
  searchText: { color: '#999', fontSize: 16, flex: 1 },

  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  historyIcon: { fontSize: 16 },
  historyText: { color: '#FFD700', fontWeight: 'bold', fontSize: 15 },
});
