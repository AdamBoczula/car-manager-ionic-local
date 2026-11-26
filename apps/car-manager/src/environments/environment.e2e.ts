import type { Environment } from './environment.interface';

/**
 * 🔧 E2E TESTING – uses Firebase emulators (auth + firestore).
 * Emulators are started by Playwright before the app server.
 */
export const environment: Environment = {
  production: false,
  firebase: {
    apiKey: 'AIzaSyBsZgCA0e0AZKWSAThiaSYKpLQPyZ8K6xk',
    authDomain: 'carmanager-local.firebaseapp.com',
    projectId: 'carmanager-local',
    storageBucket: 'carmanager-local.firebasestorage.app',
    messagingSenderId: '851248035684',
    appId: '1:851248035684:web:99224ebb831a9930cd6c71',
    measurementId: 'G-2XKNELD8WR',
  },
  googleAuth: {
    webClientId: '851248035684-8f0ie453ptbfg0ubv98t0cv2fi2n9r66.apps.googleusercontent.com',
  },
  // Use Firebase Auth + Firestore emulators in E2E tests
  useEmulators: {
    host: 'localhost',
    authPort: 9099,
    firestorePort: 8080,
  },
};
