import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '📍',
    title: 'Book in Seconds',
    desc: 'Enter your destination and get a ride instantly. No waiting, no hassle.',
  },
  {
    id: '2',
    emoji: '🗺️',
    title: 'Track in Real-Time',
    desc: 'Watch your driver arrive live on the map. Know exactly when they\'ll be there.',
  },
  {
    id: '3',
    emoji: '💰',
    title: 'Safe & Affordable',
    desc: 'Transparent pricing upfront. Pay with cash or card. Always reliable.',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList>(null);

  const next = () => {
    if (index < slides.length - 1) {
      ref.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('onboarding_done', '1');
    navigation.replace('Phone');
  };

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        ref={ref}
        data={slides}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.desc}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btn} onPress={next}>
          <Text style={styles.btnText}>
            {index === slides.length - 1 ? 'Get Started' : 'Next'}
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
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emoji: { fontSize: 100, marginBottom: 32 },
  title: { fontSize: 30, fontWeight: 'bold', color: '#FFD700', textAlign: 'center', marginBottom: 16 },
  desc: { fontSize: 17, color: '#aaa', textAlign: 'center', lineHeight: 26 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#444' },
  dotActive: { backgroundColor: '#FFD700', width: 24 },

  actions: { paddingHorizontal: 32, paddingBottom: 48, gap: 12 },
  btn: {
    backgroundColor: '#FFD700',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
  },
  btnText: { color: '#1a1a2e', fontWeight: 'bold', fontSize: 18 },
  skip: { alignItems: 'center', padding: 10 },
  skipText: { color: '#666', fontSize: 16 },
});
