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
    apiKey: 'AIzaSyBsZgCA0e0AZKWSAThiaSYKpLQPyZ8K6xk',
    authDomain: 'carmanager-local.firebaseapp.com',
    projectId: 'carmanager-local',
    storageBucket: 'carmanager-local.firebasestorage.app',
    messagingSenderId: '851248035684',
    appId: '1:851248035684:web:99224ebb831a9930cd6c71',
    measurementId: 'G-2XKNELD8WR',
  },
};
