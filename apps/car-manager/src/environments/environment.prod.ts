import type { Environment } from './environment.interface';

/**
 * 🚀 PRODUCTION – `car-manager-prod` Firebase project
 *
 * ⚠️ Podmień poniższe wartości na swoje klucze z Firebase Console:
 *    Firebase Console → Project Settings → General → Your apps → Web App → Config
 *
 * 💡 To powinien być INNY projekt Firebase niż development!
 */
export const environment: Environment = {
  production: true,
  firebase: {
    apiKey: 'TUTAJ_WPISZ_API_KEY',
    authDomain: 'car-manager-prod.firebaseapp.com',
    projectId: 'car-manager-prod',
    storageBucket: 'car-manager-prod.firebasestorage.app',
    messagingSenderId: 'TUTAJ_WPISZ_SENDER_ID',
    appId: 'TUTAJ_WPISZ_APP_ID',
  },
};
