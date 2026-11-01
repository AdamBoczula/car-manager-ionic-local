import { type Page } from '@playwright/test';

/**
 * Firebase Auth Emulator helpers for Car Manager E2E tests.
 *
 * Uses the Firebase Auth Emulator REST API to create/delete users,
 * then signs in via `window.__e2e__.signIn()` exposed by the app.
 *
 * Prerequisites:
 *   1. Firebase Auth Emulator running on localhost:9099
 *   2. App built with `useEmulators` enabled in environment.ts
 *
 * Emulator REST API docs:
 *   https://firebase.google.com/docs/reference/rest/auth#section-create-email-password
 */

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const FIREBASE_API_KEY = 'fake-api-key'; // any value works with emulator
const PROJECT_ID = 'carmanager-local';

/** Test user credentials — consistent across all E2E tests */
const TEST_USER = {
  email: 'e2e-test@carmanager.local',
  password: 'Password123!',
  displayName: 'E2E Test User',
};

/**
 * Create a user in the Firebase Auth Emulator via REST API.
 * Does NOT sign in — use `signInUser` for that.
 */
async function createEmulatorUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<string> {
  const url = `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: displayName || email,
      returnSecureToken: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // User may already exist from a previous test that wasn't cleaned up.
    // Emulator returns 400 with EMAIL_EXISTS — treat as success.
    if (response.status === 400 && body.includes('EMAIL_EXISTS')) {
      // We need the localId. Fetch it via sign-in instead.
      const signInResp = await fetch(
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, returnSecureToken: false }),
        },
      );
      if (signInResp.ok) {
        const signInData = await signInResp.json();
        return signInData.localId as string;
      }
    }
    throw new Error(`Emulator signUp failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.localId as string;
}

/**
 * Delete all accounts from the Firebase Auth Emulator.
 * Call in beforeEach to start with a clean state.
 */
async function clearEmulatorAccounts(): Promise<void> {
  const url = `${AUTH_EMULATOR_URL}/emulator/v1/projects/${PROJECT_ID}/accounts`;
  try {
    const resp = await fetch(url, { method: 'DELETE' });
    if (!resp.ok && resp.status !== 404) {
      console.warn(`clearEmulatorAccounts: unexpected status ${resp.status}`);
    }
  } catch (err) {
    // Emulator might not be running — log and continue
    console.warn(`clearEmulatorAccounts: fetch failed — ${err}`);
  }
}

/**
 * Seed an authenticated user for E2E tests.
 *
 * 1. Clears all emulator accounts
 * 2. Creates a test user via emulator REST API
 * 3. Signs in via `window.__e2e__.signIn()` in the browser context
 * 4. Waits for auth state to propagate
 */
export async function seedAuthUser(
  page: Page,
  user: {
    uid?: string; // ignored with emulator — uid is generated
    email: string;
    displayName?: string;
    password?: string;
  } = {},
): Promise<void> {
  const email = user.email || TEST_USER.email;
  const password = user.password || TEST_USER.password;

  // 1. Create user in emulator (no clear — users use unique emails per test suite)
  await createEmulatorUser(email, password, user.displayName);

  // 3. Navigate to app so Firebase SDK initializes
  await page.goto('/').catch(() => {});
  await page.waitForTimeout(1000);

  // 4. Sign in via exposed __e2e__ helper
  await page.evaluate(
    ({ email, password }) => {
      const e2e = (window as Record<string, unknown>)
        .__e2e__ as {
        signIn: (e: string, p: string) => Promise<unknown>;
      } | null;
      if (!e2e) throw new Error('window.__e2e__ not found — is useEmulators enabled?');
      return e2e.signIn(email, password);
    },
    { email, password },
  );

  // 5. Wait for Angular to pick up the auth state change and auto-navigate to dashboard
  await page.waitForTimeout(1000);
}

/**
 * Sign in an existing user that was previously created via seedAuthUser.
 * Does NOT clear emulator accounts or create new users.
 * Used in beforeEach when beforeAll already seeded the user.
 */
export async function signInExistingUser(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  // Navigate to app so Firebase SDK initializes
  await page.goto('/').catch(() => {});
  await page.waitForTimeout(1000);

  // Sign in via exposed __e2e__ helper
  await page.evaluate(
    ({ email, password }) => {
      const e2e = (window as Record<string, unknown>)
        .__e2e__ as {
        signIn: (e: string, p: string) => Promise<unknown>;
      } | null;
      if (!e2e) throw new Error('window.__e2e__ not found — is useEmulators enabled?');
      return e2e.signIn(email, password);
    },
    { email, password },
  );

  // Wait for Angular to pick up the auth state change
  await page.waitForTimeout(500);
}

/**
 * Clear authentication state for a clean test run.
 * Signs out via Firebase SDK and clears all emulator accounts.
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Sign out in browser context (if signed in)
  await page.evaluate(() => {
    const e2e = (window as Record<string, unknown>)
      .__e2e__ as {
      signOut: () => Promise<void>;
    } | null;
    return e2e?.signOut();
  }).catch(() => {});

  await page.waitForTimeout(300);

  // NOTE: Do NOT clear emulator accounts here — tests in parallel
  // describe blocks would delete each other's users.
  // Each test suite uses a unique email, so there's no conflict.
}

/**
 * Check if a user is authenticated by reading from the page.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const authService = (
      window as Record<string, unknown>
    ).ng as { getAuthState?: () => boolean } | undefined;
    // Fallback: check if we're on dashboard (auth guard would redirect otherwise)
    return window.location.pathname.includes('/dashboard');
  });
}