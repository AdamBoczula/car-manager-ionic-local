/// <reference types="@capacitor/keyboard" />
// bugfix: docs/bugs/11-broken-android-build.md

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carmanager.app',
  appName: 'Car Manager',
  webDir: 'dist/car-manager/browser',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false,
      },
    },
    Keyboard: {
      // bugfix: docs/bugs/10-native-keyboard-integration.md
      // Resize the WebView even when the status bar overlays it, otherwise the
      // software keyboard covers the bottom half of forms on Android.
      resizeOnFullScreen: true,
    },
  },
};

export default config;
