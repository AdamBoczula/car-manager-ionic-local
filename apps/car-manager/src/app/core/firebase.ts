import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import { environment } from '../../environments/environment';

/**
 * Inicjalizacja Firebase – wywoływana RAZ przy starcie aplikacji.
 * Eksportuje gotowe instancje Firestore i Auth do użycia w serwisach.
 */

const app: FirebaseApp = initializeApp(environment.firebase);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

/**
 * Connect to Firebase emulators when configured (dev & E2E tests).
 * Must be called BEFORE any Firestore/Auth operations.
 */
if (environment.useEmulators) {
  const { host, authPort, firestorePort } = environment.useEmulators;
  connectAuthEmulator(auth, `http://${host}:${authPort}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, host, firestorePort);
  console.log(
    `🔧 Firebase emulators connected: Auth(${host}:${authPort}), Firestore(${host}:${firestorePort})`
  );
}

/**
 * Expose auth helpers on window for E2E tests when using emulators.
 * Tests call __e2e__.signIn() / signOut() after creating users via emulator REST API.
 */
if (!environment.production && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>)['__e2e__'] = {
    signIn: (email: string, password: string) =>
      signInWithEmailAndPassword(auth, email, password),
    signOut: () => fbSignOut(auth),
  };
}

/**
 * Włącz offline persistence dla Firestore (kluczowe dla offline-first).
 * Firestore automatycznie cache'uje dane w IndexedDB i synchronizuje,
 * gdy połączenie wróci.
 */
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn(
      'Firestore offline – wiele kart otwartych, persistence działa tylko w jednej.'
    );
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore offline – przeglądarka nie wspiera IndexedDB.');
  }
});

export { app, db, auth };