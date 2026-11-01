import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { environment } from '../../environments/environment';

/**
 * Inicjalizacja Firebase – wywoływana RAZ przy starcie aplikacji.
 * Eksportuje gotowe instancje Firestore i Auth do użycia w serwisach.
 */

const app: FirebaseApp = initializeApp(environment.firebase);
const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

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