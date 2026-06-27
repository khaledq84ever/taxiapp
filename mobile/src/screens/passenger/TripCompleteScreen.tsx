import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Share,
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function TripCompleteScreen({ navigation, route }: any) {
  const { currentTrip } = useSelector((s: RootState) => s.trip);
  const { user } = useSelector((s: RootState) => s.auth);
  const trip = route.params?.trip || currentTrip || {};

  const referralCode = user?.id?.slice(-6).toUpperCase() ?? 'TAXI00';

  const handleRate = () => {
    navigation.replace('RateTrip', { trip });
  };

  const handleDone = () => {
    navigation.replace('PassengerHome');
  };

  const handleShare = () => {
    Share.share({
      message: `I just took a ride with TaxiApp! Fast, safe & affordable. Use my code ${referralCode} for 20% off your first ride! Download now 🚗`,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkEmoji}>🎉</Text>
        </View>
        <Text style={styles.title}>Trip Complete!</Text>
        <Text style={styles.subtitle}>Thanks for riding with TaxiApp</Text>

        <View style={styles.fareCard}>
          <Text style={styles.fareLabelBig}>Total Fare</Text>
          <Text style={styles.fareValueBig}>{trip.finalFare ?? trip.fareEstimate ?? '—'} SAR</Text>
          <View style={styles.payBadge}>
            <Text style={styles.payBadgeText}>
              {trip.paymentMethod === 'CASH' ? '💵 Paid in Cash' : '💳 Charged to Card'}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Trip Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>📍</Text>
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {trip.pickupAddress || 'Current Location'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>🏁</Text>
            <View style={styles.summaryText}>
              <Text style={styles.summaryLabel}>Dropoff</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>
                {trip.dropoffAddress || 'Destination'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{trip.distanceKm ?? '—'} km</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {trip.durationMin ?? '—'} min
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{trip.finalFare ?? trip.fareEstimate ?? '—'}</Text>
              <Text style={styles.statLabel}>SAR</Text>
            </View>
          </View>
        </View>

        {/* Referral share card */}
        <View style={styles.referralCard}>
          <Text style={styles.referralTitle}>🎁 Share & Earn</Text>
          <Text style={styles.referralDesc}>
            Give friends 20% off their first ride. You earn 10 SAR for every friend who rides.
          </Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>📤 Share Code {referralCode}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.rateBtn} onPress={handleRate}>
          <Text style={styles.rateBtnText}>⭐ Rate Your Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.doneBtn} onPress={handleDone}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, alignItems: 'center', paddingBottom: 40 },

  checkCircle: {
    width: 100,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  checkEmoji: { fontSize: 52 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { color: '#888', fontSize: 16, marginBottom: 28 },

  fareCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  fareLabelBig: { color: '#aaa', fontSize: 14, marginBottom: 6 },
  fareValueBig: { color: '#FFD700', fontSize: 48, fontWeight: 'bold', marginBottom: 12 },
  payBadge: { backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  payBadgeText: { color: '#FFD700', fontWeight: '600', fontSize: 14 },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  summaryTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  summaryIcon: { fontSize: 20, marginTop: 2 },
  summaryText: { flex: 1 },
  summaryLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#1a1a2e', fontSize: 15, fontWeight: '500', marginTop: 3 },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
  statLabel: { color: '#888', fontSize: 12, marginTop: 2 },

  referralCard: {
    backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20,
    width: '100%', marginBottom: 16, alignItems: 'center',
  },
  referralTitle: { color: '#FFD700', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  referralDesc: { color: '#aaa', fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 14 },
  shareBtn: {
    backgroundColor: '#FFD700', borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12,
  },
  shareBtnText: { color: '#1a1a2e', fontWeight: '800', fontSize: 14 },

  rateBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  rateBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 17 },
  doneBtn: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  doneBtnText: { color: '#666', fontWeight: '600', fontSize: 16 },
});
