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

export interface Environment {
  production: boolean;
  firebase: FirebaseConfig;
  /** When true, Firebase Auth + Firestore connect to local emulators */
  useEmulators?: EmulatorConfig;
}