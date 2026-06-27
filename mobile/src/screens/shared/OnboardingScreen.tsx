import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🚗',
    badge: 'FAST',
    badgeColor: '#22c55e',
    title: 'Ride in Seconds',
    desc: 'Book a ride instantly. See real-time driver arrival — no calls, no waiting.',
    highlight: 'Use code WELCOME50 for 50% off your first ride!',
    highlightColor: '#FFD700',
    stats: [
      { value: '3 min', label: 'Avg pickup' },
      { value: '500+', label: 'Drivers' },
      { value: '4.9★', label: 'Rating' },
    ],
  },
  {
    id: '2',
    emoji: '📦',
    badge: 'NEW',
    badgeColor: '#3b82f6',
    title: 'Send & Deliver',
    desc: 'Send packages across the city. Track live — from pickup to doorstep.',
    highlight: 'Perfect for businesses, shops & personal deliveries.',
    highlightColor: '#3b82f6',
    stats: [
      { value: '30 min', label: 'Avg delivery' },
      { value: '24/7',  label: 'Available' },
      { value: '100%',  label: 'Tracked' },
    ],
  },
  {
    id: '3',
    emoji: '💰',
    badge: 'EARN',
    badgeColor: '#f59e0b',
    title: 'Drive & Earn',
    desc: 'Become a driver. Set your own hours. Earn 150–400 SAR every day.',
    highlight: '80% of every fare goes straight to you.',
    highlightColor: '#f59e0b',
    stats: [
      { value: '80%',     label: 'Driver cut' },
      { value: '400 SAR', label: 'Avg/day' },
      { value: 'Anytime', label: 'Your hours' },
    ],
  },
  {
    id: '4',
    emoji: '🔒',
    badge: 'SAFE',
    badgeColor: '#ef4444',
    title: 'Safe Every Ride',
    desc: 'SOS button, live tracking shared with family, verified drivers only.',
    highlight: 'Your safety is our #1 priority.',
    highlightColor: '#ef4444',
    stats: [
      { value: '🆘', label: 'SOS button' },
      { value: '📍', label: 'Live track' },
      { value: '✅', label: 'Verified' },
    ],
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (i: number) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    ref.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
  };

  const next = () => {
    if (index < slides.length - 1) {
      goTo(index + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    navigation.replace('Phone');
  };

  const slide = slides[index];

  return (
    <SafeAreaView style={styles.container}>
      {/* Hidden flat list for scroll sync */}
      <FlatList
        ref={ref}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        renderItem={() => <View style={{ width }} />}
        style={{ height: 0 }}
      />

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Badge */}
        <View style={[styles.badge, { backgroundColor: slide.badgeColor }]}>
          <Text style={styles.badgeText}>{slide.badge}</Text>
        </View>

        {/* Emoji */}
        <Text style={styles.emoji}>{slide.emoji}</Text>

        {/* Title */}
        <Text style={styles.title}>{slide.title}</Text>

        {/* Description */}
        <Text style={styles.desc}>{slide.desc}</Text>

        {/* Stats row */}
        <View style={styles.stats}>
          {slide.stats.map((s) => (
            <View key={s.label} style={styles.stat}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Highlight */}
        <View style={[styles.highlight, { borderColor: slide.highlightColor }]}>
          <Text style={[styles.highlightText, { color: slide.highlightColor }]}>{slide.highlight}</Text>
        </View>
      </Animated.View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)}>
            <View style={[styles.dot, i === index && styles.dotActive]} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>
            {index === slides.length - 1 ? '🚀 Get Started' : 'Next →'}
          </Text>
        </TouchableOpacity>
        {index < slides.length - 1 && (
          <TouchableOpacity style={styles.skip} onPress={finish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  badge: {
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20,
  },
  badgeText: { color: '#fff', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },

  emoji: { fontSize: 96, marginBottom: 24 },

  title: { fontSize: 32, fontWeight: '900', color: '#FFD700', textAlign: 'center', marginBottom: 14, lineHeight: 38 },

  desc: { fontSize: 16, color: '#bbb', textAlign: 'center', lineHeight: 25, marginBottom: 24 },

  stats: {
    flexDirection: 'row', gap: 0,
    backgroundColor: '#0f0f1f', borderRadius: 18, overflow: 'hidden',
    marginBottom: 20, width: '100%',
  },
  stat: {
    flex: 1, alignItems: 'center', padding: 14,
    borderRightWidth: 1, borderRightColor: '#222',
  },
  statValue: { color: '#FFD700', fontSize: 18, fontWeight: '900', marginBottom: 3 },
  statLabel: { color: '#666', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

  highlight: {
    borderWidth: 1.5, borderRadius: 14, padding: 14, width: '100%',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  highlightText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333' },
  dotActive: { backgroundColor: '#FFD700', width: 28, borderRadius: 4 },

  actions: { paddingHorizontal: 28, paddingBottom: 44, gap: 12 },
  btn: {
    backgroundColor: '#FFD700', borderRadius: 18, padding: 18, alignItems: 'center',
  },
  btnText: { color: '#1a1a2e', fontWeight: '900', fontSize: 18 },
  skip: { alignItems: 'center', padding: 10 },
  skipText: { color: '#444', fontSize: 15 },
});
