import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { ratingsApi } from '../../services/api';

const QUICK_COMMENTS = [
  'Great driver!',
  'Very punctual',
  'Clean car',
  'Friendly driver',
  'Safe driving',
];

export default function RateTripScreen({ navigation, route }: any) {
  const { trip } = route.params as { trip: any };
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const driverName = trip.driver?.user?.name || 'your driver';

  const handleSubmit = async () => {
    if (score === 0) return Alert.alert('Select a rating', 'Please tap a star to rate.');
    setLoading(true);
    try {
      await ratingsApi.create({ tripId: trip.id, score, comment: comment.trim() || undefined });
      Alert.alert('Thank you!', 'Your rating has been submitted.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Could not submit rating';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent!'];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Rate Your Trip</Text>
      <Text style={styles.subtitle}>How was your ride with {driverName}?</Text>

      {/* Trip summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>📍</Text>
          <Text style={styles.summaryText} numberOfLines={1}>{trip.pickupAddress}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryIcon}>🏁</Text>
          <Text style={styles.summaryText} numberOfLines={1}>{trip.dropoffAddress}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Total Fare</Text>
          <Text style={styles.fareValue}>{trip.finalFare ?? trip.fareEstimate} SAR</Text>
        </View>
      </View>

      {/* Stars */}
      <View style={styles.starsContainer}>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <TouchableOpacity key={s} onPress={() => setScore(s)} style={styles.starBtn}>
              <Text style={[styles.star, s <= score && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.scoreLabel}>
          {score > 0 ? LABELS[score] : 'Tap a star to rate'}
        </Text>
      </View>

      {/* Quick comment chips */}
      {score >= 4 && (
        <View style={styles.chipsSection}>
          <Text style={styles.chipsLabel}>What did you like?</Text>
          <View style={styles.chips}>
            {QUICK_COMMENTS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, comment === c && styles.chipActive]}
                onPress={() => setComment(comment === c ? '' : c)}
              >
                <Text style={[styles.chipText, comment === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Comment input */}
      <TextInput
        style={styles.input}
        placeholder="Add a comment (optional)"
        placeholderTextColor="#aaa"
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity
        style={[styles.submitBtn, score === 0 && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading || score === 0}
      >
        {loading ? (
          <ActivityIndicator color="#1a1a2e" />
        ) : (
          <Text style={styles.submitText}>Submit Rating</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 40 },

  title: { fontSize: 26, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { color: '#666', fontSize: 15, marginBottom: 24 },

  summaryCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryIcon: { fontSize: 18 },
  summaryText: { flex: 1, color: '#1a1a2e', fontSize: 14, fontWeight: '500' },
  summaryDivider: { height: 1, backgroundColor: '#e5e5e5', marginVertical: 10 },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    marginTop: 10,
    paddingTop: 10,
  },
  fareLabel: { color: '#666', fontSize: 14 },
  fareValue: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 20 },

  starsContainer: { alignItems: 'center', marginBottom: 28 },
  starsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  starBtn: { padding: 4 },
  star: { fontSize: 48, color: '#ddd' },
  starActive: { color: '#FFD700' },
  scoreLabel: { fontSize: 17, color: '#666', fontWeight: '600' },

  chipsSection: { marginBottom: 20 },
  chipsLabel: { color: '#666', fontSize: 14, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  chipActive: { borderColor: '#FFD700', backgroundColor: '#FFFDE7' },
  chipText: { color: '#666', fontSize: 13 },
  chipTextActive: { color: '#1a1a2e', fontWeight: '600' },

  input: {
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: '#1a1a2e',
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
    backgroundColor: '#f8f8f8',
  },

  submitBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 17 },

  skipBtn: { alignItems: 'center', padding: 12 },
  skipText: { color: '#999', fontSize: 15 },
});
