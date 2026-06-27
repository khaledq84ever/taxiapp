import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { ratingsApi } from '../../services/api';

export default function DriverTripCompleteScreen({ navigation, route }: any) {
  const { trip } = route.params as { trip: any };
  const earned = trip?.finalFare ?? trip?.fareEstimate ?? 0;
  const commission = (earned * 0.2).toFixed(2);
  const net = (earned - parseFloat(commission)).toFixed(2);
  const [rating, setRating] = useState(0);
  const [rated, setRated] = useState(false);

  const handleRate = async (score: number) => {
    setRating(score);
    try {
      await ratingsApi.create({ tripId: trip.id, score });
      setRated(true);
    } catch {
      Alert.alert('Error', 'Could not submit rating');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        <Text style={styles.title}>Trip Complete!</Text>
        <Text style={styles.subtitle}>Great job! Here's your earnings summary.</Text>

        <View style={styles.earnCard}>
          <Text style={styles.earnLabel}>You earned</Text>
          <Text style={styles.earnValue}>{net} SAR</Text>
          <Text style={styles.earnSub}>After 20% platform commission</Text>
        </View>

        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Trip Fare</Text>
            <Text style={styles.breakdownValue}>{earned} SAR</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Platform (20%)</Text>
            <Text style={[styles.breakdownValue, { color: '#ef4444' }]}>- {commission} SAR</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { fontWeight: 'bold', color: '#1a1a2e' }]}>Net Earnings</Text>
            <Text style={[styles.breakdownValue, { fontWeight: 'bold', color: '#16a34a' }]}>{net} SAR</Text>
          </View>
        </View>

        <View style={styles.tripSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>📍</Text>
            <View>
              <Text style={styles.summaryLabel}>Pickup</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{trip.pickupAddress || 'Pickup point'}</Text>
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryIcon}>🏁</Text>
            <View>
              <Text style={styles.summaryLabel}>Dropoff</Text>
              <Text style={styles.summaryValue} numberOfLines={1}>{trip.dropoffAddress || 'Destination'}</Text>
            </View>
          </View>
        </View>

        {/* Rate passenger */}
        {!rated ? (
          <View style={styles.rateCard}>
            <Text style={styles.rateTitle}>Rate your passenger</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity key={s} onPress={() => handleRate(s)}>
                  <Text style={[styles.star, s <= rating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.rateHint}>Tap a star to rate</Text>
          </View>
        ) : (
          <View style={styles.rateCard}>
            <Text style={styles.ratedText}>✅ Rating submitted — thanks!</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => navigation.replace('DriverHome')}
        >
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.earningsBtn}
          onPress={() => navigation.replace('DriverEarnings')}
        >
          <Text style={styles.earningsBtnText}>View All Earnings</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 24, alignItems: 'center', paddingBottom: 48 },

  iconCircle: {
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
  icon: { fontSize: 52 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { color: '#888', fontSize: 15, marginBottom: 24 },

  earnCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  earnLabel: { color: '#aaa', fontSize: 14, marginBottom: 6 },
  earnValue: { color: '#FFD700', fontSize: 52, fontWeight: 'bold', marginBottom: 6 },
  earnSub: { color: '#555', fontSize: 13 },

  breakdownCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  breakdownTitle: { fontSize: 14, color: '#888', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  breakdownLabel: { color: '#666', fontSize: 15 },
  breakdownValue: { fontSize: 15, color: '#1a1a2e' },
  breakdownDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8 },

  tripSummary: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  summaryIcon: { fontSize: 18, marginTop: 2 },
  summaryLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryValue: { color: '#1a1a2e', fontWeight: '500', fontSize: 14, marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },

  homeBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  homeBtnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 17 },
  earningsBtn: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  earningsBtnText: { color: '#666', fontWeight: '600', fontSize: 15 },

  rateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  rateTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a2e', marginBottom: 12 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  star: { fontSize: 36, color: '#ddd' },
  starActive: { color: '#FFD700' },
  rateHint: { color: '#aaa', fontSize: 12 },
  ratedText: { color: '#16a34a', fontWeight: '700', fontSize: 15 },
});
