import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carmanager.app',
  appName: 'Car Manager',
  webDir: 'dist/car-manager/browser',
  server: {
    androidScheme: 'https',
  },
};

export default config;
