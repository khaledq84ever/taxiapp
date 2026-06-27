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
  Animated,
} from 'react-native';
import MapView, { Marker, Polyline, MapPressEvent } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { estimateFare, requestTrip } from '../../store/slices/tripSlice';
import { AppDispatch, RootState } from '../../store';

const RIDE_TYPES = [
  { key: 'ECONOMY',  label: 'Economy',  icon: '🚗', desc: 'Affordable everyday rides',     seats: 4 },
  { key: 'COMFORT',  label: 'Comfort',  icon: '🚙', desc: 'Newer cars, extra legroom',      seats: 4 },
  { key: 'PREMIUM',  label: 'Premium',  icon: '🚘', desc: 'Top-rated luxury vehicles',       seats: 4 },
] as const;

type Step = 'map' | 'choose';

export default function BookRideScreen({ navigation, route }: any) {
  const { location } = route.params as { location: { latitude: number; longitude: number } };
  const dispatch = useDispatch<AppDispatch>();
  const { fareEstimate, loading } = useSelector((s: RootState) => s.trip);

  const mapRef = useRef<MapView>(null);
  const [step, setStep] = useState<Step>('map');
  const [dropoff, setDropoff] = useState<{ latitude: number; longitude: number } | null>(null);
  const [dropoffLabel, setDropoffLabel] = useState('');
  const [selectedType, setSelectedType] = useState<'ECONOMY' | 'COMFORT' | 'PREMIUM'>('ECONOMY');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
  const [estimating, setEstimating] = useState(false);

  const handleMapPress = (e: MapPressEvent) => {
    const coord = e.nativeEvent.coordinate;
    setDropoff(coord);
    setDropoffLabel(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
    mapRef.current?.fitToCoordinates(
      [{ latitude: location.latitude, longitude: location.longitude }, coord],
      { edgePadding: { top: 80, right: 60, bottom: 340, left: 60 }, animated: true },
    );
  };

  const handleEstimate = async () => {
    if (!dropoff) return Alert.alert('Set Destination', 'Tap the map to pick a destination');
    setEstimating(true);
    try {
      await dispatch(estimateFare({
        pickupLat: location.latitude, pickupLng: location.longitude,
        dropoffLat: dropoff.latitude, dropoffLng: dropoff.longitude,
      })).unwrap();
      setStep('choose');
    } catch {
      Alert.alert('Error', 'Could not get fare estimate. Try again.');
    } finally {
      setEstimating(false);
    }
  };

  const handleBook = async () => {
    if (!dropoff) return;
    const typeOption = fareEstimate?.options?.find((o: any) => o.type === selectedType);
    try {
      await dispatch(requestTrip({
        pickupAddress: 'Current Location',
        pickupLat: location.latitude, pickupLng: location.longitude,
        dropoffAddress: dropoffLabel,
        dropoffLat: dropoff.latitude, dropoffLng: dropoff.longitude,
        paymentMethod,
        rideType: selectedType,
      })).unwrap();
      navigation.navigate('FindingDriver');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not book ride');
    }
  };

  const surge = fareEstimate?.surgeActive;
  const surgeMultiplier = fareEstimate?.surgeMultiplier ?? 1;

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
        onPress={step === 'map' ? handleMapPress : undefined}
        showsUserLocation
        showsMyLocationButton={false}
      >
        <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.pickupDot}><View style={styles.pickupInner} /></View>
        </Marker>
        {dropoff && (
          <>
            <Marker coordinate={dropoff} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.dropoffPin}><Text style={styles.dropoffPinText}>📍</Text></View>
            </Marker>
            <Polyline
              coordinates={[
                { latitude: location.latitude, longitude: location.longitude },
                dropoff,
              ]}
              strokeColor="#1a1a2e"
              strokeWidth={3}
              lineDashPattern={[8, 4]}
            />
          </>
        )}
      </MapView>

      {/* Step: pick destination */}
      {step === 'map' && (
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>Where to?</Text>

          {/* Pickup row */}
          <View style={styles.locationRow}>
            <View style={styles.dotGreen} />
            <View style={styles.locationTexts}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationValue}>Current Location</Text>
            </View>
          </View>
          <View style={styles.dashedLine} />

          {/* Dropoff row */}
          <TouchableOpacity style={styles.locationRow} activeOpacity={0.8}>
            <View style={styles.dotBlack} />
            <View style={styles.locationTexts}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={[styles.locationValue, !dropoff && styles.placeholder]}>
                {dropoff ? dropoffLabel : 'Tap map to set destination'}
              </Text>
            </View>
            {dropoff && (
              <TouchableOpacity onPress={() => { setDropoff(null); setDropoffLabel(''); }}>
                <Text style={styles.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {dropoff && (
            <TextInput
              style={styles.labelInput}
              placeholder="Add a label for this place (optional)"
              placeholderTextColor="#bbb"
              value={dropoffLabel}
              onChangeText={setDropoffLabel}
            />
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, !dropoff && styles.primaryBtnDisabled]}
            onPress={handleEstimate}
            disabled={!dropoff || estimating}
          >
            {estimating
              ? <ActivityIndicator color="#1a1a2e" />
              : <Text style={styles.primaryBtnText}>See Ride Options →</Text>}
          </TouchableOpacity>
        </View>
      )}

      {/* Step: choose ride type */}
      {step === 'choose' && fareEstimate && (
        <ScrollView style={styles.sheet} contentContainerStyle={styles.chooseContent} keyboardShouldPersistTaps="handled">
          <View style={styles.handle} />

          {/* Surge banner */}
          {surge && (
            <View style={styles.surgeBanner}>
              <Text style={styles.surgeIcon}>⚡</Text>
              <View>
                <Text style={styles.surgeTitle}>Surge Pricing Active</Text>
                <Text style={styles.surgeDesc}>High demand right now · {surgeMultiplier.toFixed(1)}x multiplier</Text>
              </View>
            </View>
          )}

          <View style={styles.tripInfo}>
            <Text style={styles.tripDist}>{fareEstimate.distanceKm} km</Text>
            <View style={styles.tripRoute}>
              <View style={styles.dotGreenSm} />
              <Text style={styles.tripRouteText} numberOfLines={1}>Current Location</Text>
            </View>
            <View style={styles.tripRoute}>
              <View style={styles.dotBlackSm} />
              <Text style={styles.tripRouteText} numberOfLines={1}>{dropoffLabel}</Text>
            </View>
          </View>

          {/* Ride type cards */}
          <Text style={styles.sectionLabel}>Choose your ride</Text>
          {RIDE_TYPES.map((rt) => {
            const option = fareEstimate.options?.find((o: any) => o.type === rt.key);
            const fare = option?.fare ?? fareEstimate.estimatedFare;
            const active = selectedType === rt.key;
            return (
              <TouchableOpacity
                key={rt.key}
                style={[styles.rideCard, active && styles.rideCardActive]}
                onPress={() => setSelectedType(rt.key)}
              >
                <Text style={styles.rideIcon}>{rt.icon}</Text>
                <View style={styles.rideInfo}>
                  <Text style={[styles.rideName, active && styles.rideNameActive]}>{rt.label}</Text>
                  <Text style={styles.rideDesc}>{rt.desc}</Text>
                </View>
                <View style={styles.ridePriceCol}>
                  <Text style={[styles.ridePrice, active && styles.ridePriceActive]}>{fare} SAR</Text>
                  {active && <View style={styles.selectedCheck}><Text style={styles.selectedCheckText}>✓</Text></View>}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Payment method */}
          <Text style={styles.sectionLabel}>Payment</Text>
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

          {/* Book */}
          <View style={styles.bookRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setStep('map')}>
              <Text style={styles.backBtnText}>← Change</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bookBtn} onPress={handleBook} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#1a1a2e" />
                : (
                  <View>
                    <Text style={styles.bookBtnText}>Book {RIDE_TYPES.find(r => r.key === selectedType)?.label}</Text>
                    <Text style={styles.bookBtnSub}>
                      {fareEstimate.options?.find((o: any) => o.type === selectedType)?.fare ?? fareEstimate.estimatedFare} SAR
                    </Text>
                  </View>
                )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Tap hint */}
      {step === 'map' && !dropoff && (
        <View style={styles.mapHint}>
          <Text style={styles.mapHintText}>👆 Tap anywhere on the map</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  pickupDot: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 3, borderColor: '#1a1a2e',
    justifyContent: 'center', alignItems: 'center',
  },
  pickupInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e' },
  dropoffPin: { alignItems: 'center' },
  dropoffPinText: { fontSize: 32 },

  mapHint: {
    position: 'absolute', top: 16, alignSelf: 'center',
    backgroundColor: 'rgba(26,26,46,0.88)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24,
  },
  mapHintText: { color: '#FFD700', fontWeight: '700', fontSize: 14 },

  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '55%', elevation: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 16,
  },
  chooseContent: { padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: '#e5e5e5', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', paddingHorizontal: 20, marginBottom: 18 },

  locationRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  dotGreen: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', marginRight: 14 },
  dotBlack: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#1a1a2e', marginRight: 14 },
  dotGreenSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 8 },
  dotBlackSm: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1a1a2e', marginRight: 8 },
  dashedLine: { width: 2, height: 16, backgroundColor: '#ddd', marginLeft: 25, marginVertical: 0 },
  locationTexts: { flex: 1 },
  locationLabel: { color: '#aaa', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: '700' },
  locationValue: { color: '#1a1a2e', fontSize: 14, fontWeight: '600', marginTop: 1 },
  placeholder: { color: '#bbb', fontWeight: '400' },
  clearX: { color: '#ccc', fontSize: 18, paddingLeft: 10 },

  labelInput: {
    marginHorizontal: 20, marginTop: 8, borderWidth: 1.5, borderColor: '#e5e5e5',
    borderRadius: 12, padding: 12, fontSize: 14, color: '#1a1a2e', backgroundColor: '#f9f9f9',
  },

  primaryBtn: {
    backgroundColor: '#FFD700', margin: 20, marginTop: 16,
    borderRadius: 16, padding: 17, alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.38 },
  primaryBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 16 },

  surgeBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF3CD', borderRadius: 14, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: '#FFD700',
  },
  surgeIcon: { fontSize: 28 },
  surgeTitle: { fontSize: 14, fontWeight: '700', color: '#1a1a2e' },
  surgeDesc: { fontSize: 12, color: '#888', marginTop: 2 },

  tripInfo: {
    backgroundColor: '#f8f8f8', borderRadius: 14, padding: 14, marginBottom: 16,
  },
  tripDist: { fontSize: 12, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  tripRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  tripRouteText: { color: '#1a1a2e', fontSize: 13, flex: 1 },

  sectionLabel: { fontSize: 12, color: '#aaa', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 },

  rideCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16,
    borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 10, backgroundColor: '#fafafa',
  },
  rideCardActive: { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  rideIcon: { fontSize: 32, marginRight: 14 },
  rideInfo: { flex: 1 },
  rideName: { fontSize: 16, fontWeight: '700', color: '#666' },
  rideNameActive: { color: '#1a1a2e' },
  rideDesc: { fontSize: 12, color: '#aaa', marginTop: 2 },
  ridePriceCol: { alignItems: 'flex-end', gap: 4 },
  ridePrice: { fontSize: 17, fontWeight: '700', color: '#aaa' },
  ridePriceActive: { color: '#1a1a2e' },
  selectedCheck: {
    backgroundColor: '#FFD700', borderRadius: 10, width: 20, height: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  selectedCheckText: { fontSize: 11, fontWeight: '900', color: '#1a1a2e' },

  payRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  payBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 14, padding: 14, backgroundColor: '#f8f8f8',
  },
  payBtnActive: { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  payIcon: { fontSize: 20 },
  payBtnText: { color: '#999', fontWeight: '600', fontSize: 15 },
  payBtnTextActive: { color: '#1a1a2e' },

  bookRow: { flexDirection: 'row', gap: 10 },
  backBtn: {
    borderWidth: 1.5, borderColor: '#e5e5e5', borderRadius: 16, padding: 16, alignItems: 'center', flex: 1,
  },
  backBtnText: { color: '#888', fontWeight: '600', fontSize: 15 },
  bookBtn: { flex: 2, backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, alignItems: 'center' },
  bookBtnText: { color: '#FFD700', fontWeight: '800', fontSize: 17 },
  bookBtnSub: { color: '#aaa', fontSize: 12, marginTop: 2 },
});
