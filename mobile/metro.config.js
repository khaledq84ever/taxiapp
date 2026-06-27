const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Strip source maps and console logs from release builds
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: true,
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.debug'],
    },
    mangle: true,
  },
};

// Exclude dev-only file extensions from the bundle
config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter((ext) => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts],
};

module.exports = config;
