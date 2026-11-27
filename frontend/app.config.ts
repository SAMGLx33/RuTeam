import { config } from 'dotenv';
config({ path: '../.env', quiet: true });
const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const googleServicesFile = process.env.RUTEAM_ANDROID_GOOGLE_SERVICES_FILE;

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
      ['expo-notifications', { defaultChannel: 'ruteam-updates' }],
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
    ios: {
      supportsTablet: true,
      bundleIdentifier:
        process.env.RUTEAM_IOS_BUNDLE_IDENTIFIER || 'org.ruteam.demo',
    },
    android: {
      package: process.env.RUTEAM_ANDROID_PACKAGE || 'org.ruteam.demo',
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
      ...(googleServicesFile ? { googleServicesFile } : {}),
    },
    web: { bundler: 'metro', output: 'single', name: 'RuTeam' },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      routeTileUrl: process.env.EXPO_PUBLIC_ROUTE_TILE_URL,
      routeTileAttribution: process.env.EXPO_PUBLIC_ROUTE_TILE_ATTRIBUTION,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  },
};
