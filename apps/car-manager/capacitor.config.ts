import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carmanager.app',
  appName: 'Car Manager',
  webDir: 'dist/car-manager/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '851248035684-8f0ie453ptbfg0ubv98t0cv2fi2n9r66.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
