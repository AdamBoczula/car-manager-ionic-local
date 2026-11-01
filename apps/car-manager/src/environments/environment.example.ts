import { Environment } from './environment.interface';

/**
 * 🔧 DEVELOPMENT – `car-manager-dev` Firebase project
 *
 * ⚠️ Podmień poniższe wartości na swoje klucze z Firebase Console:
 *    Firebase Console → Project Settings → General → Your apps → Web App → Config
 *
 * 📋 Aby użyć:
 *    1. Skopiuj ten plik:  cp environment.example.ts environment.ts
 *    2. Wklej swoje klucze Firebase w miejsca oznaczone TUTAJ_WPISZ_*
 */
export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: 'TUTAJ_WPISZ_API_KEY',
    authDomain: 'car-manager-dev.firebaseapp.com',
    projectId: 'car-manager-dev',
    storageBucket: 'car-manager-dev.firebasestorage.app',
    messagingSenderId: 'TUTAJ_WPISZ_SENDER_ID',
    appId: 'TUTAJ_WPISZ_APP_ID',
  },
};