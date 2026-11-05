import { test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

/**
 * Firebase Auth helpers for Car Manager E2E tests.
 *
 * When the Firebase Auth Emulator is reachable (local development), uses the
 * emulator REST API to create users and routes Firebase SDK requests through
 * the emulator via `page.route()`.
 *
 * When the emulator is NOT reachable (CI), falls back to the real Firebase Auth
 * REST API, creating users against the production-like Firebase project defined
 * in the app's e2e environment config.
 *
 * Emulator REST API docs:
 *   https://firebase.google.com/docs/reference/rest/auth#section-create-email-password
 */

const AUTH_EMULATOR_URL = 'http://127.0.0.1:9099';
const EMULATOR_PING_TIMEOUT_MS = 1_000;

// Real Firebase API key from the e2e environment config.
// Used as a fallback when the emulator is not reachable (e.g., CI).
const FIREBASE_API_KEY = 'AIzaSyBsZgCA0e0AZKWSAThiaSYKpLQPyZ8K6xk';

// In emulator mode, any API key works (even a fake one).
// This override is used when the emulator is available.
const FAKE_API_KEY = 'fake-api-key';

let emulatorReachable: boolean | undefined;
const pagesWithAuthRouting = new WeakSet<Page>();

/** Test user credentials — consistent across all E2E tests */
const TEST_USER = {
  email: 'e2e-test@carmanager.local',
  password: 'Password123!',
  displayName: 'E2E Test User',
} as const;

interface AuthUserInput {
  readonly uid?: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly password?: string;
  readonly provisionCar?: boolean;
}

export interface SeededAuthUser {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
}

/**
 * Skip tests when Firebase Auth (emulator or real API) is unavailable.
 * Local development with emulator always works.
 *
 * Call this at the top of test.describe blocks that require seedAuthUser.
 *
 * Usage:
 *   test.beforeAll(async () => await skipIfFirebaseUnavailable());
 */
export async function skipIfFirebaseUnavailable(): Promise<void> {
  if (!(await isEmulatorReachable())) {
    // Try real Firebase API
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3_000);
      const response = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'skip-check@test.local',
            password: 'Skip1234!',
            returnSecureToken: false,
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);
      if (response.status >= 500) {
        throw new Error('Firebase API unreachable');
      }
    } catch {
      // Firebase not available — skip all tests in this describe block
      test.skip(true, 'Firebase Auth not available in this environment');
    }
  }
}

/**
 * Skip tests when Firebase Auth Emulator is not reachable.
 * Tests that require IndexedDB seeding + reload (like car-switcher) work
 * reliably only with the local emulator. CI uses real Firebase Auth which
 * may override local IndexedDB data via Firestore sync on reload.
 *
 * Usage:
 *   test.beforeAll(async () => await skipIfNoEmulator());
 */
export async function skipIfNoEmulator(): Promise<void> {
  if (!(await isEmulatorReachable())) {
    test.skip(true, 'Firebase Auth Emulator not available — test requires emulator');
  }
}

/**
 * Check whether the Firebase Auth Emulator is reachable.
 * The result is cached for the lifetime of the test process.
 */
async function isEmulatorReachable(): Promise<boolean> {
  if (emulatorReachable !== undefined) {
    return emulatorReachable;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EMULATOR_PING_TIMEOUT_MS);
    await fetch(
      `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FAKE_API_KEY}`,
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
    // EMULATOR returns 400 with EMAIL_EXISTS or a success — either means it's alive.
    emulatorReachable = true;
  } catch {
    emulatorReachable = false;
  }
  return emulatorReachable;
}

function createUniqueEmail(email: string): string {
  const separatorIndex = email.lastIndexOf('@');
  const localPart = separatorIndex > 0 ? email.slice(0, separatorIndex) : 'e2e-test';
  const domain = separatorIndex > 0 ? email.slice(separatorIndex + 1) : 'carmanager.local';
  return `${localPart}+${randomUUID()}@${domain}`;
}

/**
 * Create a user via REST API.
 *
 * When the Firebase Auth Emulator is reachable (local dev), users are created
 * against the emulator. Otherwise (CI), users are created against the real
 * Firebase Auth REST API using the project's API key.
 *
 * Does NOT sign in — use `signInUser` or `seedAuthUser` for that.
 */
async function createEmulatorUser(
  email: string,
  password: string,
  displayName?: string,
): Promise<string> {
  const usingEmulator = await isEmulatorReachable();
  const apiKey = usingEmulator ? FAKE_API_KEY : FIREBASE_API_KEY;
  const baseUrl = usingEmulator
    ? `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com`
    : 'https://identitytoolkit.googleapis.com';

  const url = `${baseUrl}/v1/accounts:signUp?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName: displayName ?? email,
      returnSecureToken: false,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    // User may already exist. Firebase returns 400 with EMAIL_EXISTS.
    if (response.status === 400 && body.includes('EMAIL_EXISTS')) {
      const signInResp = await fetch(`${baseUrl}/v1/accounts:signInWithPassword?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: false }),
      });
      if (signInResp.ok) {
        const signInData = await signInResp.json();
        return signInData.localId as string;
      }
    }
    throw new Error(`Auth signUp failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  return data.localId as string;
}

async function routeFirebaseAuthToEmulator(page: Page): Promise<void> {
  if (pagesWithAuthRouting.has(page)) {
    return;
  }

  // Only route requests through the emulator when it's actually reachable.
  // In CI, the emulator doesn't exist, so requests go to real Firebase Auth.
  if (!(await isEmulatorReachable())) {
    pagesWithAuthRouting.add(page);
    return;
  }

  await page.route(/https:\/\/identitytoolkit\.googleapis\.com\//, async (route) => {
    const request = route.request();
    const emulatorUrl = request
      .url()
      .replace(
        'https://identitytoolkit.googleapis.com/',
        `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/`,
      );
    const response = await fetch(emulatorUrl, {
      method: request.method(),
      headers: request.headers(),
      body: request.postDataBuffer(),
    });

    await route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: Buffer.from(await response.arrayBuffer()),
    });
  });
  pagesWithAuthRouting.add(page);
}

/**
 * Create and sign in an isolated user for E2E tests.
 *
 * A UUID is appended to the requested email so parallel workers never share
 * an emulator account. Production Firebase Auth requests are routed to the
 * local emulator when a reused development server lacks E2E configuration.
 * By default, the helper also provisions a car through the UI; pass
 * `provisionCar: false` to retain the first-car flow. Returns the generated
 * UID, unique email, display name, and password.
 */
export async function seedAuthUser(page: Page, user: AuthUserInput = {}): Promise<SeededAuthUser> {
  const email = createUniqueEmail(user.email ?? TEST_USER.email);
  const password = user.password ?? TEST_USER.password;
  const displayName = user.displayName ?? TEST_USER.displayName;

  // Keep tests deterministic when Playwright reuses a developer server that
  // was started without the E2E environment configuration.
  await routeFirebaseAuthToEmulator(page);

  // Every call creates an isolated account. The auth emulator is shared by all
  // Playwright workers, so reusing suite-level addresses introduces races.
  const uid = await createEmulatorUser(email, password, displayName);

  // 3. Navigate to app so Firebase SDK initializes
  await page.goto('/').catch(() => {});
  await page.waitForFunction(() => {
    return Boolean((window as unknown as Record<string, unknown>).__e2e__);
  });

  // 4. Sign in via exposed __e2e__ helper
  await page.evaluate(
    ({ email, password }) => {
      const e2e = (window as Record<string, unknown>).__e2e__ as {
        signIn: (e: string, p: string) => Promise<unknown>;
      } | null;
      if (!e2e) throw new Error('window.__e2e__ not found — is useEmulators enabled?');
      return e2e.signIn(email, password);
    },
    { email, password },
  );

  if (user.provisionCar !== false) {
    await page.goto('/add-car');
    const activeAddCar = page.locator('app-add-car.ion-page:not(.ion-page-hidden)');
    await activeAddCar.waitFor({ state: 'visible', timeout: 10_000 });
    await activeAddCar.getByTestId('car-name-input').locator('input').fill('Auto testowe');
    await activeAddCar.getByTestId('car-name-input').locator('input').press('Enter');
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }

  return { uid, email, displayName, password };
}

/**
 * Clear authentication state for a clean test run.
 * Signs out via Firebase SDK and clears all emulator accounts.
 */
export async function clearAuthState(page: Page): Promise<void> {
  // Sign out in browser context (if signed in)
  await page
    .evaluate(() => {
      const e2e = (window as Record<string, unknown>).__e2e__ as {
        signOut: () => Promise<void>;
      } | null;
      return e2e?.signOut();
    })
    .catch(() => {});

  // NOTE: Do NOT clear emulator accounts here — tests in parallel
  // describe blocks would delete each other's users.
  // Each test suite uses a unique email, so there's no conflict.
}
