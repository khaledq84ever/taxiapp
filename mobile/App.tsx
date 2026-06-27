import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch } from 'react-redux';
import { store } from './src/store';
import { AppDispatch } from './src/store';
import AppNavigator from './src/navigation/AppNavigator';
import { initAuth } from './src/store/slices/authSlice';
import { setCurrentTrip } from './src/store/slices/tripSlice';
import { registerForPushNotifications } from './src/services/notifications';

function Root() {
  const dispatch = useDispatch<AppDispatch>();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch(initAuth())
      .then((action: any) => {
        // Restore active trip into trip slice on app launch
        if (action.payload?.activeTrip) {
          dispatch(setCurrentTrip(action.payload.activeTrip));
        }
        registerForPushNotifications();
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={splash.container}>
        <Text style={splash.logo}>🚖</Text>
        <Text style={splash.name}>TaxiApp</Text>
        <Text style={splash.tagline}>Your ride, on demand</Text>
        <ActivityIndicator color="#FFD700" style={{ marginTop: 48 }} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Root />
    </Provider>
  );
}

const splash = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: { fontSize: 72, marginBottom: 16 },
  name: { fontSize: 36, fontWeight: 'bold', color: '#FFD700', letterSpacing: 1 },
  tagline: { color: '#aaa', fontSize: 16, marginTop: 6 },
});
