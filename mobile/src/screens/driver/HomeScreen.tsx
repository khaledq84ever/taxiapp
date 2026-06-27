import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { driversApi, tripsApi } from '../../services/api';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { socketService } from '../../services/socket';

export default function DriverHomeScreen({ navigation }: any) {
  const { user } = useSelector((s: RootState) => s.auth);
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [heading, setHeading] = useState<number>(-1);
  const [earnings, setEarnings] = useState(0);
  const [tripRequest, setTripRequest] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const mapRef = useRef<MapView>(null);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // Initial setup: get location + load driver status
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      try {
        const driver = await driversApi.getStatus();
        setIsOnline(driver.data.isOnline);
        setEarnings(driver.data.totalEarnings);
      } catch {
        // driver not registered yet
      }
    })();
  }, []);

  // Real-time location stream while online
  useEffect(() => {
    if (!isOnline) {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
      return;
    }

    const startWatching = async () => {
      locationSubRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 3000,
          distanceInterval: 15,
        },
        (loc) => {
          const pos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          const h = loc.coords.heading ?? -1;
          setLocation(pos);
          setHeading(h);
          socketService.emit('driver:location-update', {
            lat: pos.latitude,
            lng: pos.longitude,
            heading: h,
          });
          // Smoothly follow driver on map
          mapRef.current?.animateToRegion(
            { ...pos, latitudeDelta: 0.01, longitudeDelta: 0.01 },
            400,
          );
        },
      );
    };

    startWatching();

    return () => {
      locationSubRef.current?.remove();
      locationSubRef.current = null;
    };
  }, [isOnline]);

  // Socket: listen for trip requests when online
  useEffect(() => {
    if (!isOnline) {
      socketService.off('server:new-trip-request');
      return;
    }

    socketService.connect().then(() => {
      socketService.on('server:new-trip-request', (data) => {
        setTripRequest(data);
      });
    }).catch(() => {
      Alert.alert('Connection', 'Could not connect to server. Check your internet.');
    });

    return () => {
      socketService.off('server:new-trip-request');
    };
  }, [isOnline]);

  const handleToggleOnline = async (value: boolean) => {
    try {
      await driversApi.toggleOnline(value);
      setIsOnline(value);
      if (!value) setTripRequest(null);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Cannot change status');
    }
  };

  const handleAcceptTrip = async () => {
    if (!tripRequest?.trip?.id) return;
    setAccepting(true);
    try {
      await tripsApi.accept(tripRequest.trip.id);
      socketService.emit('driver:trip-accepted', { tripId: tripRequest.trip.id });
      const acceptedTrip = {
        ...tripRequest.trip,
        status: 'ACCEPTED',
        passenger: tripRequest.passenger,
      };
      setTripRequest(null);
      navigation.navigate('ActiveTrip', { trip: acceptedTrip });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Could not accept trip');
      setTripRequest(null);
    } finally {
      setAccepting(false);
    }
  };

  const handleDeclineTrip = () => setTripRequest(null);

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            anchor={{ x: 0.5, y: 0.5 }}
            flat
          >
            <View style={[
              styles.selfMarker,
              heading >= 0 && { transform: [{ rotate: `${heading}deg` }] },
            ]}>
              <Text style={styles.selfMarkerText}>🚗</Text>
            </View>
          </Marker>
        </MapView>
      )}

      {/* Status panel */}
      <View style={styles.panel}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.name}>{user?.name || 'Driver'}</Text>
            <Text style={[styles.status, isOnline && styles.statusOnline]}>
              {isOnline ? '🟢 Online — waiting for trips' : '🔴 Offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            trackColor={{ false: '#ddd', true: '#16a34a' }}
            thumbColor={isOnline ? '#fff' : '#fff'}
          />
        </View>

        {/* Earnings row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{earnings.toFixed(0)} SAR</Text>
            <Text style={styles.statLabel}>Total Earned</Text>
          </View>
          <View style={[styles.statCard, styles.statCardHighlight]}>
            <Text style={[styles.statValue, { color: '#FFD700' }]}>80%</Text>
            <Text style={[styles.statLabel, { color: '#aaa' }]}>Your cut</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{isOnline ? '🟢' : '🔴'}</Text>
            <Text style={styles.statLabel}>{isOnline ? 'Active' : 'Offline'}</Text>
          </View>
        </View>

        {/* Earnings potential hint */}
        {!isOnline && (
          <View style={styles.earnHint}>
            <Text style={styles.earnHintText}>💡 Drivers earn avg 150–400 SAR/day. Go online to start!</Text>
          </View>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('DriverEarnings')}>
            <Text style={styles.quickBtnIcon}>💰</Text>
            <Text style={styles.quickBtnText}>Earnings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.quickBtnIcon}>🔔</Text>
            <Text style={styles.quickBtnText}>Alerts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.quickBtnIcon}>👤</Text>
            <Text style={styles.quickBtnText}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Trip request modal */}
      <Modal visible={!!tripRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>🚖 New Trip Request</Text>

            <View style={styles.passengerRow}>
              <Text style={styles.passengerAvatar}>👤</Text>
              <Text style={styles.passengerName}>
                {tripRequest?.passenger?.name || 'Passenger'}
              </Text>
            </View>

            <View style={styles.addressBlock}>
              <View style={styles.addrRow}>
                <Text style={styles.addrIcon}>📍</Text>
                <View style={styles.addrTexts}>
                  <Text style={styles.addrLabel}>Pickup</Text>
                  <Text style={styles.addrValue} numberOfLines={2}>
                    {tripRequest?.trip?.pickupAddress}
                  </Text>
                </View>
              </View>
              <View style={styles.addrDivider} />
              <View style={styles.addrRow}>
                <Text style={styles.addrIcon}>🏁</Text>
                <View style={styles.addrTexts}>
                  <Text style={styles.addrLabel}>Dropoff</Text>
                  <Text style={styles.addrValue} numberOfLines={2}>
                    {tripRequest?.trip?.dropoffAddress}
                  </Text>
                </View>
              </View>
            </View>

            {/* Scheduled badge */}
            {tripRequest?.trip?.scheduledAt && (
              <View style={styles.scheduledBadge}>
                <Text style={styles.scheduledIcon}>🗓️</Text>
                <Text style={styles.scheduledText}>
                  Scheduled: {new Date(tripRequest.trip.scheduledAt).toLocaleString('en-SA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
              </View>
            )}

            <View style={styles.fareRow}>
              <View style={styles.fareItem}>
                <Text style={styles.fareLabel}>Fare</Text>
                <Text style={styles.fareValue}>{tripRequest?.trip?.fareEstimate} SAR</Text>
              </View>
              <View style={styles.fareItem}>
                <Text style={styles.fareLabel}>Type</Text>
                <Text style={styles.fareValue}>{tripRequest?.trip?.rideType ?? 'ECONOMY'}</Text>
              </View>
              <View style={styles.fareItem}>
                <Text style={styles.fareLabel}>Payment</Text>
                <Text style={styles.fareValue}>
                  {tripRequest?.trip?.paymentMethod === 'CASH' ? '💵 Cash' : '💳 Card'}
                </Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.declineBtn} onPress={handleDeclineTrip}>
                <Text style={styles.declineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={handleAcceptTrip}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#1a1a2e" />
                ) : (
                  <Text style={styles.acceptText}>Accept Trip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  selfMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#FFD700',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  selfMarkerText: { fontSize: 24 },

  panel: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  status: { color: '#999', marginTop: 4, fontSize: 13 },
  statusOnline: { color: '#16a34a' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  statCard: {
    flex: 1, backgroundColor: '#f8f8f8', borderRadius: 14, padding: 12, alignItems: 'center', gap: 4,
  },
  statCardHighlight: { backgroundColor: '#1a1a2e' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1a1a2e' },
  statLabel: { color: '#888', fontSize: 11, fontWeight: '600' },

  earnHint: {
    backgroundColor: '#FFFDE7', borderRadius: 12, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#FFD700',
  },
  earnHintText: { color: '#1a1a2e', fontSize: 13, fontWeight: '500' },

  quickActions: { flexDirection: 'row', gap: 10 },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  quickBtnIcon: { fontSize: 24 },
  quickBtnText: { color: '#1a1a2e', fontWeight: '600', fontSize: 13 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },

  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  passengerAvatar: { fontSize: 28, marginRight: 12 },
  passengerName: { fontSize: 17, fontWeight: '600', color: '#1a1a2e' },

  addressBlock: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  addrRow: { flexDirection: 'row', alignItems: 'flex-start' },
  addrIcon: { fontSize: 18, marginRight: 10, marginTop: 2 },
  addrTexts: { flex: 1 },
  addrLabel: { color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrValue: { color: '#1a1a2e', fontSize: 14, fontWeight: '500', marginTop: 2 },
  addrDivider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 10 },

  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  fareItem: { alignItems: 'center' },
  fareLabel: { color: '#999', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  fareValue: { color: '#1a1a2e', fontSize: 16, fontWeight: 'bold', marginTop: 4 },

  scheduledBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#dbeafe', borderRadius: 10, padding: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#93c5fd',
  },
  scheduledIcon: { fontSize: 16 },
  scheduledText: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },

  modalActions: { flexDirection: 'row', gap: 12 },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  declineText: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#FFD700',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  acceptText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },
});
