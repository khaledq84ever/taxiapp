import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { estimateFare, requestTrip } from '../../store/slices/tripSlice';
import { AppDispatch, RootState } from '../../store';

type Step = 'pick-destination' | 'review';

export default function BookRideScreen({ navigation, route }: any) {
  const { location } = route.params as { location: { latitude: number; longitude: number } };
  const dispatch = useDispatch<AppDispatch>();
  const { fareEstimate, loading } = useSelector((s: RootState) => s.trip);

  const mapRef = useRef<MapView>(null);
  const [step, setStep] = useState<Step>('pick-destination');
  const [dropoffCoord, setDropoffCoord] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dropoffLabel, setDropoffLabel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [estimating, setEstimating] = useState(false);

  const handleMapPress = (e: MapPressEvent) => {
    const coord = e.nativeEvent.coordinate;
    setDropoffCoord(coord);
    setDropoffLabel(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);

    // Fit map to show both pickup and dropoff
    mapRef.current?.fitToCoordinates(
      [
        { latitude: location.latitude, longitude: location.longitude },
        coord,
      ],
      { edgePadding: { top: 80, right: 60, bottom: 260, left: 60 }, animated: true },
    );
  };

  const handleGetEstimate = async () => {
    if (!dropoffCoord) return Alert.alert('Set Destination', 'Tap the map to set your destination');
    setEstimating(true);
    try {
      await dispatch(estimateFare({
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        dropoffLat: dropoffCoord.latitude,
        dropoffLng: dropoffCoord.longitude,
      })).unwrap();
      setStep('review');
    } catch {
      Alert.alert('Error', 'Could not estimate fare. Try again.');
    } finally {
      setEstimating(false);
    }
  };

  const handleBook = async () => {
    if (!dropoffCoord) return;
    try {
      await dispatch(requestTrip({
        pickupAddress: 'Current Location',
        pickupLat: location.latitude,
        pickupLng: location.longitude,
        dropoffAddress: dropoffLabel,
        dropoffLat: dropoffCoord.latitude,
        dropoffLng: dropoffCoord.longitude,
        paymentMethod,
      })).unwrap();
      navigation.navigate('FindingDriver');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not book ride');
    }
  };

  return (
    <View style={styles.container}>
      {/* Map — always visible */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.04,
          longitudeDelta: 0.04,
        }}
        onPress={step === 'pick-destination' ? handleMapPress : undefined}
      >
        {/* Pickup marker */}
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          anchor={{ x: 0.5, y: 0.5 }}
        >
          <View style={styles.pickupMarker}>
            <Text style={styles.pickupMarkerText}>📍</Text>
          </View>
        </Marker>

        {/* Dropoff marker */}
        {dropoffCoord && (
          <Marker
            coordinate={dropoffCoord}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.dropoffMarker}>
              <Text style={styles.dropoffMarkerText}>🏁</Text>
            </View>
          </Marker>
        )}
      </MapView>

      {/* Tap hint overlay */}
      {step === 'pick-destination' && !dropoffCoord && (
        <View style={styles.tapHint}>
          <Text style={styles.tapHintText}>👆 Tap map to set destination</Text>
        </View>
      )}

      {/* Bottom sheet */}
      {step === 'pick-destination' ? (
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Where are you going?</Text>

          {/* Pickup row */}
          <View style={styles.locationRow}>
            <View style={styles.dotFrom} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationValue} numberOfLines={1}>Current Location</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          {/* Dropoff row */}
          <View style={styles.locationRow}>
            <View style={styles.dotTo} />
            <View style={styles.locationInfo}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={[styles.locationValue, !dropoffCoord && styles.locationPlaceholder]} numberOfLines={1}>
                {dropoffCoord ? dropoffLabel : 'Tap map to pick location'}
              </Text>
            </View>
            {dropoffCoord && (
              <TouchableOpacity onPress={() => { setDropoffCoord(null); setDropoffLabel(''); }}>
                <Text style={styles.clearBtn}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Manual label input */}
          {dropoffCoord && (
            <TextInput
              style={styles.labelInput}
              placeholder="Add a name for this location (optional)"
              placeholderTextColor="#aaa"
              value={dropoffLabel}
              onChangeText={setDropoffLabel}
            />
          )}

          <TouchableOpacity
            style={[styles.estimateBtn, !dropoffCoord && styles.estimateBtnDisabled]}
            onPress={handleGetEstimate}
            disabled={!dropoffCoord || estimating}
          >
            {estimating ? (
              <ActivityIndicator color="#1a1a2e" />
            ) : (
              <Text style={styles.estimateBtnText}>Get Fare Estimate →</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.reviewContent}>
          <Text style={styles.sheetTitle}>Confirm Your Ride</Text>

          {/* Route summary */}
          <View style={styles.routeCard}>
            <View style={styles.locationRow}>
              <View style={styles.dotFrom} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationValue}>Current Location</Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.locationRow}>
              <View style={styles.dotTo} />
              <View style={styles.locationInfo}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationValue} numberOfLines={2}>{dropoffLabel}</Text>
              </View>
            </View>
          </View>

          {/* Estimate */}
          {fareEstimate && (
            <View style={styles.estimateCard}>
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Distance</Text>
                <Text style={styles.estimateVal}>{fareEstimate.distanceKm} km</Text>
              </View>
              <View style={styles.estimateDivider} />
              <View style={styles.estimateRow}>
                <Text style={styles.estimateLabel}>Estimated Fare</Text>
                <Text style={styles.estimateFare}>{fareEstimate.estimatedFare} SAR</Text>
              </View>
            </View>
          )}

          {/* Payment */}
          <Text style={styles.payLabel}>Payment Method</Text>
          <View style={styles.payRow}>
            {(['CASH', 'CARD'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.payBtn, paymentMethod === m && styles.payBtnActive]}
                onPress={() => setPaymentMethod(m)}
              >
                <Text style={styles.payIcon}>{m === 'CASH' ? '💵' : '💳'}</Text>
                <Text style={[styles.payBtnText, paymentMethod === m && styles.payBtnTextActive]}>
                  {m === 'CASH' ? 'Cash' : 'Card'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('pick-destination')}>
              <Text style={styles.backBtnText}>← Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#1a1a2e" />
              ) : (
                <Text style={styles.bookBtnText}>Book Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  tapHint: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(26,26,46,0.85)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tapHintText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },

  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '48%',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  reviewContent: { padding: 20, paddingBottom: 32 },
  sheetTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e', margin: 20, marginBottom: 16 },

  locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  dotFrom: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFD700', borderWidth: 2, borderColor: '#1a1a2e', marginRight: 12 },
  dotTo: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a1a2e', marginRight: 12 },
  routeLine: { width: 2, height: 18, backgroundColor: '#ddd', marginLeft: 25, marginVertical: 2 },
  locationInfo: { flex: 1 },
  locationLabel: { color: '#aaa', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  locationValue: { color: '#1a1a2e', fontSize: 14, fontWeight: '500', marginTop: 2 },
  locationPlaceholder: { color: '#aaa' },
  clearBtn: { color: '#aaa', fontSize: 18, paddingLeft: 8 },

  labelInput: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1a1a2e',
    backgroundColor: '#f8f8f8',
  },

  estimateBtn: {
    backgroundColor: '#FFD700',
    margin: 20,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  estimateBtnDisabled: { opacity: 0.4 },
  estimateBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },

  routeCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 14,
  },

  estimateCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  estimateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  estimateLabel: { color: '#aaa', fontSize: 14 },
  estimateVal: { color: '#fff', fontSize: 15, fontWeight: '600' },
  estimateDivider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  estimateFare: { color: '#FFD700', fontSize: 24, fontWeight: 'bold' },

  payLabel: { color: '#aaa', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  payRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#f8f8f8',
  },
  payBtnActive: { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  payIcon: { fontSize: 20 },
  payBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  payBtnTextActive: { color: '#1a1a2e' },

  actionRow: { flexDirection: 'row', gap: 10 },
  backBtn: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    flex: 1,
  },
  backBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },
  bookBtn: {
    flex: 2,
    backgroundColor: '#FFD700',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  bookBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 17 },

  pickupMarker: {
    width: 38,
    height: 38,
    backgroundColor: '#1a1a2e',
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarkerText: { fontSize: 20 },
  dropoffMarker: {
    width: 44,
    height: 44,
    backgroundColor: '#FFD700',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  dropoffMarkerText: { fontSize: 26 },
});
