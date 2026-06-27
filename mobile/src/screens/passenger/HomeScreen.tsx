import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { driversApi, notificationsApi } from '../../services/api';
import { setNearbyDrivers } from '../../store/slices/tripSlice';
import { socketService } from '../../services/socket';

const { height } = Dimensions.get('window');

export default function PassengerHomeScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [location, setLocation] = useState<any>(null);
  const [nearbyDrivers, setNearbyDriversLocal] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ride' | 'deliver'>('ride');
  const mapRef = useRef<MapView>(null);

  // Get location and center map
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(loc.coords);
      mapRef.current?.animateToRegion({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      }, 800);
    })();
  }, []);

  // Fetch nearby drivers once + WebSocket live updates
  useEffect(() => {
    if (!location) return;

    const fetchInitial = async () => {
      try {
        const res = await driversApi.getNearby(location.latitude, location.longitude);
        const drivers = res.data ?? [];
        setNearbyDriversLocal(drivers);
        dispatch(setNearbyDrivers(drivers));
      } catch {}
    };
    fetchInitial();

    // Subscribe to live driver positions via WebSocket
    socketService.connect().then(() => {
      socketService.emit('join:public-drivers', {});
      socketService.on('public:driver-location', (data: { driverId: string; lat: number; lng: number; heading: number }) => {
        setNearbyDriversLocal((prev) => {
          const idx = prev.findIndex((d: any) => d.id === data.driverId);
          if (idx === -1) return prev;
          const updated = [...prev];
          updated[idx] = { ...updated[idx], currentLat: data.lat, currentLng: data.lng };
          return updated;
        });
      });
    }).catch(() => {});

    // Fallback poll every 30s to catch new drivers coming online
    const id = setInterval(fetchInitial, 30000);
    return () => {
      clearInterval(id);
      socketService.off('public:driver-location');
    };
  }, [location]);

  // Notification badge
  useEffect(() => {
    notificationsApi.getUnreadCount().then((r) => setUnreadCount(r.data.count)).catch(() => {});
    const id = setInterval(() => {
      notificationsApi.getUnreadCount().then((r) => setUnreadCount(r.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const recenterMap = () => {
    if (!location) return;
    mapRef.current?.animateToRegion({
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.015,
      longitudeDelta: 0.015,
    }, 600);
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Full-screen map — Google Maps style */}
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation
        showsMyLocationButton={false}
        showsCompass={false}
        showsTraffic
        initialRegion={
          location
            ? { latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.015, longitudeDelta: 0.015 }
            : { latitude: 24.7136, longitude: 46.6753, latitudeDelta: 0.1, longitudeDelta: 0.1 }
        }
      >
        {/* Nearby driver pins — live, updates every 5s */}
        {nearbyDrivers.map((d, i) =>
          d.currentLat && d.currentLng ? (
            <Marker key={d.id} coordinate={{ latitude: d.currentLat, longitude: d.currentLng }} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={[styles.carPin, i % 3 === 0 && styles.carPinDeliver]}>
                <Text style={styles.carPinText}>{i % 3 === 0 ? '📦' : '🚗'}</Text>
              </View>
            </Marker>
          ) : null,
        )}
      </MapView>

      {/* Top bar — floating over map */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.menuBtnText}>☰</Text>
        </TouchableOpacity>

        {/* Search bar */}
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => navigation.navigate('BookRide', { location, mode: activeTab })}
          activeOpacity={0.9}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>
            {activeTab === 'ride' ? 'Where to?' : 'Where to deliver?'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
          <Text style={styles.bellText}>🔔</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      {/* Driver count pill */}
      {nearbyDrivers.length > 0 && (
        <View style={styles.driversPill}>
          <Text style={styles.driversPillText}>🚗 {nearbyDrivers.length} drivers nearby</Text>
        </View>
      )}

      {/* Recenter button — like Google Maps */}
      <TouchableOpacity style={styles.recenterBtn} onPress={recenterMap}>
        <Text style={styles.recenterIcon}>⊕</Text>
      </TouchableOpacity>

      {/* Bottom card — ride / deliver tabs + CTA */}
      <View style={styles.bottomCard}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {(['ride', 'deliver'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, activeTab === t && styles.tabActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={styles.tabIcon}>{t === 'ride' ? '🚗' : '📦'}</Text>
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'ride' ? 'Ride' : 'Deliver'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Big CTA */}
        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => navigation.navigate('BookRide', { location, mode: activeTab })}
          activeOpacity={0.88}
        >
          <Text style={styles.ctaText}>
            {activeTab === 'ride' ? '🚗  Book a Ride' : '📦  Send Package'}
          </Text>
        </TouchableOpacity>

        {/* Quick row */}
        <View style={styles.quickRow}>
          <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate('TripHistory')}>
            <View style={styles.quickIcon}><Text style={styles.quickIconText}>📋</Text></View>
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate('Profile')}>
            <View style={styles.quickIcon}><Text style={styles.quickIconText}>👤</Text></View>
            <Text style={styles.quickLabel}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate('Notifications')}>
            <View style={[styles.quickIcon, unreadCount > 0 && styles.quickIconBadge]}>
              <Text style={styles.quickIconText}>🔔</Text>
            </View>
            <Text style={styles.quickLabel}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickItem} onPress={() => navigation.navigate('DriverRegister')}>
            <View style={[styles.quickIcon, { backgroundColor: '#FFD700' }]}><Text style={styles.quickIconText}>💰</Text></View>
            <Text style={styles.quickLabel}>Earn</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  carPin: {
    width: 36, height: 36, backgroundColor: '#fff', borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    elevation: 4, borderWidth: 1.5, borderColor: '#FFD700',
  },
  carPinDeliver: { borderColor: '#3b82f6' },
  carPinText: { fontSize: 18 },

  // Top floating bar
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 8 : 52,
    left: 12, right: 12,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  menuBtn: {
    width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
    elevation: 6,
  },
  menuBtnText: { fontSize: 18, color: '#1a1a2e' },
  searchBar: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
    elevation: 6,
  },
  searchIcon: { fontSize: 16 },
  searchText: { flex: 1, color: '#888', fontSize: 15, fontWeight: '500' },
  bellBtn: {
    width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6,
    elevation: 6,
  },
  bellText: { fontSize: 20 },
  badge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: '#ef4444', borderRadius: 7, minWidth: 14, height: 14,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: 'bold' },

  driversPill: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 70 : 108,
    alignSelf: 'center',
    backgroundColor: '#1a1a2eee', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
  },
  driversPillText: { color: '#FFD700', fontSize: 12, fontWeight: '700' },

  recenterBtn: {
    position: 'absolute',
    right: 16,
    bottom: height * 0.38,
    width: 44, height: 44, backgroundColor: '#fff', borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6,
    elevation: 6,
  },
  recenterIcon: { fontSize: 22, color: '#1a1a2e' },

  // Bottom card
  bottomCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 20,
  },

  tabs: {
    flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 14,
    padding: 4, marginBottom: 14,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
    elevation: 2,
  },
  tabIcon: { fontSize: 16 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#1a1a2e' },

  ctaBtn: {
    backgroundColor: '#1a1a2e', borderRadius: 18, paddingVertical: 18,
    alignItems: 'center', marginBottom: 14,
  },
  ctaText: { color: '#FFD700', fontWeight: '800', fontSize: 18 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickItem: { alignItems: 'center', gap: 5 },
  quickIcon: {
    width: 48, height: 48, backgroundColor: '#f5f5f5', borderRadius: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  quickIconBadge: { backgroundColor: '#fef2f2' },
  quickIconText: { fontSize: 22 },
  quickLabel: { color: '#666', fontSize: 11, fontWeight: '600' },
});
