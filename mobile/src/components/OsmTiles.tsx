import React from 'react';
import { UrlTile } from 'react-native-maps';

// Free CARTO/OpenStreetMap raster tiles — real map without a Google Maps API key.
// Use together with mapType="none" on the MapView.
// shouldReplaceMapContent tells Android these tiles ARE the basemap, so they are
// not hidden behind Google's blank canvas (which happens without a valid key).
// Style: CARTO dark_all — midnight blue/dark theme matching the app's navy brand.
export default function OsmTiles() {
  return (
    <UrlTile
      urlTemplate="https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
      shouldReplaceMapContent={true}
      maximumZ={19}
      flipY={false}
      tileSize={256}
    />
  );
}
