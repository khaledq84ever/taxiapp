import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { driversApi, notificationsApi } from '../../services/api';
import { setNearbyDrivers } from '../../store/slices/tripSlice';

const TABS = [
  { key: 'ride',    icon: '🚗', label: 'Ride' },
  { key: 'deliver', icon: '📦', label: 'Deliver' },
] as const;

const QUICK_DESTINATIONS = [
  { icon: '🏠', label: 'Home',   sub: 'Add home address' },
  { icon: '💼', label: 'Work',   sub: 'Add work address' },
  { icon: '🛒', label: 'Mall',   sub: 'Nearest shopping mall' },
  { icon: '✈️', label: 'Airport', sub: 'King Abdulaziz Airport' },
];

export default function PassengerHomeScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((s: RootState) => s.auth);
  const [location, setLocation] = useState<any>(null);
  const [nearbyDrivers, setNearbyDriversLocal] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<'ride' | 'deliver'>('ride');
  const mapRef = useRef<MapView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    })();
  }, []);

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

  useEffect(() => {
    notificationsApi.getUnreadCount().then((res) => setUnreadCount(res.data.count)).catch(() => {});
    const interval = setInterval(() => {
      notificationsApi.getUnreadCount().then((res) => setUnreadCount(res.data.count)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      {/* Map */}
      {location && (
        <Animated.View style={[styles.mapWrap, { opacity: fadeAnim }]}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
            showsUserLocation
            showsMyLocationButton={false}
            showsCompass={false}
          >
            {nearbyDrivers.map((driver) =>
              driver.currentLat && driver.currentLng ? (
                <Marker key={driver.id} coordinate={{ latitude: driver.currentLat, longitude: driver.currentLng }} anchor={{ x: 0.5, y: 0.5 }}>
                  <View style={styles.carMarker}><Text style={styles.carMarkerText}>🚗</Text></View>
                </Marker>
              ) : null,
            )}
          </MapView>
        </Animated.View>
      )}

      {!location && <View style={styles.mapPlaceholder} />}

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <View style={styles.topLeft}>
          <View style={styles.locationPill}>
            <Text style={styles.locationPillIcon}>📍</Text>
            <Text style={styles.locationPillText} numberOfLines={1}>
              {location ? `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}` : 'Getting location...'}
            </Text>
          </View>
        </View>
        <View style={styles.topRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.iconBtnText}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.iconBtnText}>👤</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Driver count badge */}
      {nearbyDrivers.length > 0 && (
        <View style={styles.driversBadge}>
          <Text style={styles.driversBadgeText}>🚗 {nearbyDrivers.length} drivers nearby</Text>
        </View>
      )}

      {/* Bottom panel */}
      <View style={styles.panel}>
        {/* Greeting */}
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'} 👋</Text>

        {/* Tab selector */}
        <View style={styles.tabs}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search / Book button */}
        <TouchableOpacity
          style={styles.searchBox}
          onPress={() => navigation.navigate('BookRide', { location, mode: activeTab })}
          activeOpacity={0.85}
        >
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>
            {activeTab === 'ride' ? 'Where are you going?' : 'Where to deliver?'}
          </Text>
          <View style={styles.searchArrow}>
            <Text style={styles.searchArrowText}>→</Text>
          </View>
        </TouchableOpacity>

        {/* Quick destinations */}
        <Text style={styles.quickLabel}>Quick destinations</Text>
        <View style={styles.quickGrid}>
          {QUICK_DESTINATIONS.map((d) => (
            <TouchableOpacity
              key={d.label}
              style={styles.quickBtn}
              onPress={() => navigation.navigate('BookRide', { location, mode: activeTab })}
            >
              <Text style={styles.quickIcon}>{d.icon}</Text>
              <Text style={styles.quickName}>{d.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* History link */}
        <TouchableOpacity style={styles.historyRow} onPress={() => navigation.navigate('TripHistory')}>
          <Text style={styles.historyIcon}>📋</Text>
          <Text style={styles.historyText}>View trip history</Text>
          <Text style={styles.historyArrow}>›</Text>
        </TouchableOpacity>

        {/* Become a Driver CTA */}
        <TouchableOpacity
          style={styles.driverCta}
          onPress={() => navigation.navigate('DriverRegister')}
          activeOpacity={0.85}
        >
          <View style={styles.driverCtaLeft}>
            <Text style={styles.driverCtaIcon}>🚗</Text>
            <View>
              <Text style={styles.driverCtaTitle}>Earn 150–400 SAR/day</Text>
              <Text style={styles.driverCtaDesc}>Drive with us — join thousands of drivers</Text>
            </View>
          </View>
          <Text style={styles.driverCtaArrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  mapWrap: { flex: 1 },
  map: { flex: 1 },
  mapPlaceholder: { flex: 1, backgroundColor: '#e8eaed' },

  carMarker: {
    width: 38, height: 38, backgroundColor: '#fff', borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    elevation: 4, borderWidth: 1.5, borderColor: '#FFD700',
  },
  carMarkerText: { fontSize: 20 },

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 48, paddingBottom: 12,
  },
  topLeft: { flex: 1, marginRight: 10 },
  topRight: { flexDirection: 'row', gap: 8 },

  locationPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1a1a2eee', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
  },
  locationPillIcon: { fontSize: 14 },
  locationPillText: { color: '#fff', fontSize: 13, fontWeight: '600', flex: 1 },

  iconBtn: {
    width: 40, height: 40, backgroundColor: '#1a1a2eee', borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  iconBtnText: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -2, right: -2,
    backgroundColor: '#ef4444', borderRadius: 8, minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },

  driversBadge: {
    position: 'absolute', top: 110, alignSelf: 'center',
    backgroundColor: '#1a1a2eee', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
  },
  driversBadgeText: { color: '#FFD700', fontWeight: '700', fontSize: 13 },

  panel: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 28,
    elevation: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 16,
  },

  greeting: { fontSize: 20, fontWeight: '800', color: '#1a1a2e', marginBottom: 14, marginTop: 4 },

  tabs: { flexDirection: 'row', backgroundColor: '#f5f5f5', borderRadius: 14, padding: 4, marginBottom: 14 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  tabActive: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  tabIcon: { fontSize: 16 },
  tabText: { fontSize: 14, fontWeight: '600', color: '#aaa' },
  tabTextActive: { color: '#1a1a2e' },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#f5f5f5', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 15,
    marginBottom: 18, borderWidth: 1.5, borderColor: '#eee',
  },
  searchIcon: { fontSize: 18 },
  searchText: { flex: 1, color: '#999', fontSize: 15, fontWeight: '500' },
  searchArrow: {
    width: 30, height: 30, backgroundColor: '#1a1a2e', borderRadius: 15,
    justifyContent: 'center', alignItems: 'center',
  },
  searchArrowText: { color: '#FFD700', fontSize: 16, fontWeight: 'bold' },

  quickLabel: { fontSize: 12, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn: {
    flex: 1, backgroundColor: '#f8f8f8', borderRadius: 14, padding: 12,
    alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#f0f0f0',
  },
  quickIcon: { fontSize: 22 },
  quickName: { fontSize: 11, fontWeight: '700', color: '#1a1a2e' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0', marginBottom: 10,
  },
  historyIcon: { fontSize: 16 },
  historyText: { flex: 1, color: '#FFD700', fontWeight: '700', fontSize: 14 },
  historyArrow: { color: '#ccc', fontSize: 22 },

  driverCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
  },
  driverCtaLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  driverCtaIcon: { fontSize: 28 },
  driverCtaTitle: { color: '#FFD700', fontWeight: '800', fontSize: 14 },
  driverCtaDesc: { color: '#aaa', fontSize: 12, marginTop: 2 },
  driverCtaArrow: { color: '#FFD700', fontSize: 22, fontWeight: 'bold' },
});
