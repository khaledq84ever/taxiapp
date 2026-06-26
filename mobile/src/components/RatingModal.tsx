import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ratingsApi } from '../services/api';

interface Props {
  visible: boolean;
  tripId: string;
  driverName?: string;
  onDone: () => void;
}

export default function RatingModal({ visible, tripId, driverName, onDone }: Props) {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return Alert.alert('Please select a rating');
    setLoading(true);
    try {
      await ratingsApi.create({ tripId, score, comment: comment.trim() || undefined });
      onDone();
    } catch {
      onDone(); // skip if already rated
    } finally {
      setLoading(false);
    }
  };

  const STARS = [1, 2, 3, 4, 5];
  const LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Rate Your Trip</Text>
          <Text style={styles.subtitle}>
            How was your experience with {driverName || 'your driver'}?
          </Text>

          {/* Stars */}
          <View style={styles.starsRow}>
            {STARS.map((s) => (
              <TouchableOpacity key={s} onPress={() => setScore(s)} style={styles.starBtn}>
                <Text style={[styles.star, s <= score && styles.starActive]}>★</Text>
              </TouchableOpacity>
            ))}
          </View>

          {score > 0 && (
            <Text style={styles.scoreLabel}>{LABELS[score]}</Text>
          )}

          {/* Comment */}
          <TextInput
            style={styles.input}
            placeholder="Leave a comment (optional)"
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

          <TouchableOpacity style={styles.skipBtn} onPress={onDone}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    width: '100%',
    alignItems: 'center',
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 6 },
  subtitle: { color: '#666', fontSize: 14, textAlign: 'center', marginBottom: 24 },

  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  starBtn: { padding: 4 },
  star: { fontSize: 44, color: '#ddd' },
  starActive: { color: '#FFD700' },

  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 16,
  },

  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1a1a2e',
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 80,
  },

  submitBtn: {
    backgroundColor: '#FFD700',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 16 },

  skipBtn: { padding: 10 },
  skipText: { color: '#999', fontSize: 14 },
});
