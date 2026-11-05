/**
 * CI helpers for Car Manager E2E tests.
 *
 * Provides utilities for detecting CI environment and skipping
 * tests that require external services (Firebase Auth, emulators).
 */

/**
 * Detect whether we're running in CI (GitHub Actions).
 */
export function isCI(): boolean {
  return (
    process.env.CI === 'true' ||
    process.env.GITHUB_ACTIONS === 'true' ||
    process.env.NX_BRANCH !== undefined
  );
}

/**
 * Check whether Firebase Auth emulator or real API is reachable.
 * Returns true if either is available.
 */
let firebaseReachable: boolean | undefined;

export async function isFirebaseReachable(firebaseApiKey: string): Promise<boolean> {
  if (firebaseReachable !== undefined) {
    return firebaseReachable;
  }

  // Try emulator first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1_000);
    await fetch(
      `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ping@test.local',
          password: 'Ping1234!',
          returnSecureToken: false,
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    firebaseReachable = true;
    return true;
  } catch {
    // Emulator not available
  }

  // Try real Firebase API
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3_000);
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ping-ci@test.local',
          password: 'Ping1234!',
          returnSecureToken: false,
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
    // If we get any response (even 400 EMAIL_EXISTS), API is reachable
    firebaseReachable = response.status < 500;
    return firebaseReachable;
  } catch {
    firebaseReachable = false;
    return false;
  }
}
