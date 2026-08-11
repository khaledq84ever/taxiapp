import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';

// Last-resort screen: only ever shown if guest auto-login keeps failing after
// several automatic retries (App.tsx). No phone number, no input — the app
// has no registration flow, so the only thing to do here is try the server
// again. See project memory: "NO OTP / phone registration for passengers".
export default function ConnectingScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🚖</Text>
      <Text style={styles.title}>Can't reach TaxiApp</Text>
      <Text style={styles.subtitle}>Check your connection and try again.</Text>
      <TouchableOpacity style={styles.button} onPress={onRetry}>
        <Text style={styles.buttonText}>Retry</Text>
      </TouchableOpacity>
      <ActivityIndicator color="#FFD700" style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { color: '#aaa', fontSize: 15, marginBottom: 28, textAlign: 'center' },
  button: { backgroundColor: '#FFD700', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 12 },
  buttonText: { color: '#1a1a2e', fontWeight: '700', fontSize: 16 },
});
