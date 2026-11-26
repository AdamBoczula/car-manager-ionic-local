export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface EmulatorConfig {
  host: string;
  authPort: number;
  firestorePort: number;
}

export interface GoogleAuthConfig {
  /** Google OAuth Web Client ID (used on Android and as iOS server client ID for Firebase) */
  webClientId: string;
  /** Optional Google OAuth iOS Client ID (from GoogleService-Info.plist CLIENT_ID) */
  iOSClientId?: string;
}

export interface Environment {
  production: boolean;
  firebase: FirebaseConfig;
  googleAuth?: GoogleAuthConfig;
  /** When true, Firebase Auth + Firestore connect to local emulators */
  useEmulators?: EmulatorConfig;
}
