import React from 'react';
import { Text, StyleSheet, View, Platform, StatusBar } from 'react-native';

// Required credit for OpenStreetMap tiles. Place after the MapView inside the screen container.
export default function MapAttribution() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>© OpenStreetMap © CARTO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) + 62 : 100,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  text: { fontSize: 9, color: '#555' },
});
