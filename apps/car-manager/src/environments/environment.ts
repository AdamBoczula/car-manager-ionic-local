import { Environment } from './environment.interface';

/**
 * 🔧 DEVELOPMENT – `carmanager-local` Firebase project
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
  // Use Firebase Auth + Firestore emulators in dev & E2E
  useEmulators: {
    host: 'localhost',
    authPort: 9099,
    firestorePort: 8080,
  },
};