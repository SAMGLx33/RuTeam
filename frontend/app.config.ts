import { config } from 'dotenv';
config({ path: '../.env', quiet: true });
export default {
  expo: {
    name: 'RuTeam',
    slug: 'ruteam-demo',
    version: '0.1.0',
    scheme: 'ruteam',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    plugins: ['expo-router', 'expo-secure-store'],
    ios: { supportsTablet: true },
    android: { package: 'org.ruteam.demo' },
    web: { bundler: 'metro', output: 'single', name: 'RuTeam' },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      routeTileUrl: process.env.EXPO_PUBLIC_ROUTE_TILE_URL,
      routeTileAttribution: process.env.EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION,
    },
  },
};
