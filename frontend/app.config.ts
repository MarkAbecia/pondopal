import type { ExpoConfig } from 'expo/config';

// Set by EAS per build profile (eas.json `environment`); see README "Builds".
// not a secret: the EAS CLI needs it locally to find the project
const projectId = process.env.EAS_PROJECT_ID ?? '2e7f0585-9694-4ac2-adb7-b9f47bca5327';
const bundleId = process.env.APP_BUNDLE_ID ?? 'ph.markabecia.pondopal';

const config: ExpoConfig = {
  name: 'PondoPal',
  slug: 'pondopal',
  owner: 'nexora-engineering',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'pondopal',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    bundleIdentifier: bundleId,
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#E6F6EE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    // Phone-first app with no API routes: plain SPA. 'server' rendered every route in Node and hung the dev server.
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-localization',
    'expo-secure-store',
    ['expo-notifications', { color: '#0F9D58' }],
    [
      'expo-image-picker',
      { photosPermission: 'PondoPal needs your photos to attach receipts.', cameraPermission: false },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F9FAFB',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
        dark: { backgroundColor: '#0B0F14' },
      },
    ],
  ],
  // projectId is needed for push tokens (src/features/notifications/push.ts)
  extra: projectId ? { eas: { projectId } } : {},
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
