/**
 * 🔧 Seed script – creates/verifies a test user in Firebase Auth.
 *
 * Usage:
 *   npx ts-node apps/car-manager/scripts/seed-dev.ts
 *   or: npm exec nx run car-manager:seed-dev
 *
 * This script uses the Firebase Auth REST API to create a user
 * with email boczuleq@gmail.com and password Password123.
 *
 * If the account already exists, it verifies the credentials.
 * The API key is read from the environment config.
 */

// Read environment config directly (no Angular DI available)
const firebaseConfig = {
  apiKey: 'AIzaSyBsZgCA0e0AZKWSAThiaSYKpLQPyZ8K6xk',
  authDomain: 'carmanager-local.firebaseapp.com',
  projectId: 'carmanager-local',
};

const TEST_EMAIL = 'boczuleq@gmail.com';
const TEST_PASSWORD = 'Password123';

const AUTH_API = `https://identitytoolkit.googleapis.com/v1/accounts`;

async function signUp(email: string, password: string): Promise<void> {
  const url = `${AUTH_API}:signUp?key=${firebaseConfig.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Konto utworzone:', data.email);
    console.log(`   UID: ${data.localId}`);
    console.log(`   Email: ${data.email}`);
  } else {
    const error = data.error || {};
    if (error.message === 'EMAIL_EXISTS') {
      console.log('ℹ️  Konto już istnieje:', email);
      await signIn(email, password);
    } else {
      console.error('❌ Błąd rejestracji:', error.message);
      console.error('   Pełna odpowiedź:', JSON.stringify(data, null, 2));
    }
  }
}

async function signIn(email: string, password: string): Promise<void> {
  const url = `${AUTH_API}:signInWithPassword?key=${firebaseConfig.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();

  if (response.ok) {
    console.log('✅ Logowanie testowe OK:', data.email);
    console.log('   Konto jest gotowe do użycia w apce.');
  } else {
    const error = data.error || {};
    if (error.message === 'INVALID_LOGIN_CREDENTIALS') {
      console.error('❌ Nieprawidłowe hasło! Konto istnieje ale hasło się nie zgadza.');
      console.error('   Jeśli chcesz zresetować hasło — zrób to w konsoli Firebase.');
    } else {
      console.error('❌ Błąd logowania:', error.message);
      console.error('   Pełna odpowiedź:', JSON.stringify(data, null, 2));
    }
  }
}

async function main(): Promise<void> {
  console.log('🔧 Car Manager – Seed dev user');
  console.log('──────────────────────────────────');
  console.log(`   Firebase projekt: ${firebaseConfig.projectId}`);
  console.log(`   Auth domain:     ${firebaseConfig.authDomain}`);
  console.log(`   Test email:      ${TEST_EMAIL}`);
  console.log(`   Test hasło:      ${TEST_PASSWORD}`);
  console.log('──────────────────────────────────\n');

  try {
    await signUp(TEST_EMAIL, TEST_PASSWORD);
  } catch (err) {
    console.error('❌ Nieoczekiwany błąd:', err);
    process.exit(1);
  }
}

main();
