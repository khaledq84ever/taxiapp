import React from 'react';
import { UrlTile } from 'react-native-maps';

// Free OpenStreetMap tiles — real map without a Google Maps API key.
// Use together with mapType="none" on the MapView.
export default function OsmTiles() {
  return (
    <UrlTile
      urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maximumZ={19}
      flipY={false}
      zIndex={-1}
    />
  );
}
