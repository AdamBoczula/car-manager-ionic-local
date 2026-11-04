import { type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

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
const pagesWithAuthRouting = new WeakSet<Page>();

/** Test user credentials — consistent across all E2E tests */
const TEST_USER = {
  email: 'e2e-test@carmanager.local',
  password: 'Password123!',
  displayName: 'E2E Test User',
} as const;

type AuthUserInput = {
  readonly uid?: string;
  readonly email?: string;
  readonly displayName?: string;
  readonly password?: string;
  readonly provisionCar?: boolean;
};

export type SeededAuthUser = {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly password: string;
};

function createUniqueEmail(email: string): string {
  const separatorIndex = email.lastIndexOf('@');
  const localPart =
    separatorIndex > 0 ? email.slice(0, separatorIndex) : 'e2e-test';
  const domain =
    separatorIndex > 0 ? email.slice(separatorIndex + 1) : 'carmanager.local';
  return `${localPart}+${randomUUID()}@${domain}`;
}

/**
 * Create a user in the Firebase Auth Emulator via REST API.
 * Does NOT sign in — use `signInUser` for that.
 */
async function createEmulatorUser(
  email: string,
  password: string,
  displayName?: string
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
        }
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

async function routeFirebaseAuthToEmulator(page: Page): Promise<void> {
  if (pagesWithAuthRouting.has(page)) {
    return;
  }

  await page.route(
    /https:\/\/identitytoolkit\.googleapis\.com\//,
    async (route) => {
      const request = route.request();
      const emulatorUrl = request
        .url()
        .replace(
          'https://identitytoolkit.googleapis.com/',
          `${AUTH_EMULATOR_URL}/identitytoolkit.googleapis.com/`
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
    }
  );
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
export async function seedAuthUser(
  page: Page,
  user: AuthUserInput = {}
): Promise<SeededAuthUser> {
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
    return Boolean((window as unknown as Record<string, unknown>)['__e2e__']);
  });

  // 4. Sign in via exposed __e2e__ helper
  await page.evaluate(
    ({ email, password }) => {
      const e2e = (window as Record<string, unknown>).__e2e__ as {
        signIn: (e: string, p: string) => Promise<unknown>;
      } | null;
      if (!e2e)
        throw new Error('window.__e2e__ not found — is useEmulators enabled?');
      return e2e.signIn(email, password);
    },
    { email, password }
  );

  if (user.provisionCar !== false) {
    await page.goto('/add-car');
    const activeAddCar = page.locator(
      'app-add-car.ion-page:not(.ion-page-hidden)'
    );
    await activeAddCar.waitFor({ state: 'visible', timeout: 10_000 });
    await activeAddCar
      .getByTestId('car-name-input')
      .locator('input')
      .fill('Auto testowe');
    await activeAddCar
      .getByTestId('car-name-input')
      .locator('input')
      .press('Enter');
    await page.waitForURL(/\/dashboard(?:[/?#]|$)/, { timeout: 10_000 });
  }

  return { uid, email, displayName, password };
}

/**
 * Sign in an existing user that was previously created via seedAuthUser.
 * Does NOT clear emulator accounts or create new users.
 * Used in beforeEach when beforeAll already seeded the user.
 */
export async function signInExistingUser(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  // Navigate to app so Firebase SDK initializes
  await page.goto('/').catch(() => {});
  await page.waitForFunction(() => {
    return Boolean((window as unknown as Record<string, unknown>)['__e2e__']);
  });

  // Sign in via exposed __e2e__ helper
  await page.evaluate(
    ({ email, password }) => {
      const e2e = (window as Record<string, unknown>).__e2e__ as {
        signIn: (e: string, p: string) => Promise<unknown>;
      } | null;
      if (!e2e)
        throw new Error('window.__e2e__ not found — is useEmulators enabled?');
      return e2e.signIn(email, password);
    },
    { email, password }
  );
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

/**
 * Check if a user is authenticated by reading from the page.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Fallback: check if we're on dashboard (auth guard would redirect otherwise)
    return window.location.pathname.includes('/dashboard');
  });
}
