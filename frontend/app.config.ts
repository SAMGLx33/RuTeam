import { config } from 'dotenv';
config({ path: '../.env', quiet: true });
export default {
  expo: {
    name: 'RuTeam',
    slug: 'ruteam-demo',
    version: '0.1.0',
    scheme: 'ruteam',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    plugins: [
      'expo-router',
      'expo-secure-store',
      [
        'expo-camera',
        {
          cameraPermission:
            'RuTeam usa la cámara para leer el código de abordaje.',
          microphonePermission: false,
          recordAudioAndroid: false,
        },
      ],
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'RuTeam usa tu ubicación cuando eliges centrar el mapa o compartirla en un viaje activo.',
          locationAlwaysPermission: false,
          locationAlwaysAndWhenInUsePermission: false,
        },
      ],
    ],
    ios: { supportsTablet: true },
    android: {
      package: 'org.ruteam.demo',
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
    web: { bundler: 'metro', output: 'single', name: 'RuTeam' },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      routeTileUrl: process.env.EXPO_PUBLIC_ROUTE_TILE_URL,
      routeTileAttribution: process.env.EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION,
    },
  },
};
