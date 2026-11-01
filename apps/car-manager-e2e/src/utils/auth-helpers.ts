import { type Page } from '@playwright/test';

/**
 * Firebase Auth test helpers for Car Manager e2e tests.
 *
 * These helpers bypass the real Firebase Auth flow by directly manipulating
 * the app's auth state through Ionic Storage. This avoids:
 *   - Hitting Firebase servers during tests
 *   - Needing real credentials
 *   - Rate-limiting issues
 *   - Slowing down tests with external network calls
 *
 * The Car Manager auth flow:
 *   1. AuthService checks Ionic Storage for a cached user profile
 *   2. Firebase Auth SDK manages the actual session
 *   3. Auth guards (authGuard, noAuthGuard) check auth state
 *
 * To fully simulate authentication in e2e, you need to:
 *   1. Seed a user profile into Ionic Storage
 *   2. Either mock Firebase Auth or seed the necessary Firestore data
 *
 * For unit/component tests, use test doubles instead.
 * For e2e tests, prefer seeding the app's own storage layer.
 */

/**
 * Seed an authenticated user into Ionic Storage.
 * This sets the user profile that AuthService reads from storage.
 */
export async function seedAuthUser(
  page: Page,
  user: {
    uid: string;
    email: string;
    displayName?: string;
  },
): Promise<void> {
  await page.evaluate(
    async ({ dbName, userData }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const storeName = database.objectStoreNames[0] || '_ionickv';
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Store user profile (as AuthService would)
      store.put(
        { value: userData },
        'auth:user',
      );

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    { dbName: '__car_manager_db', userData: user },
  );
}

/**
 * Clear the auth state from Ionic Storage (simulate logout).
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.evaluate(async ({ dbName }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const storeName = database.objectStoreNames[0] || '_ionickv';
    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Delete auth-related keys
    store.delete('auth:user');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { dbName: '__car_manager_db' });
}

/**
 * Check if a user is authenticated by reading from Ionic Storage.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(async ({ dbName }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const storeName = database.objectStoreNames[0] || '_ionickv';

    return new Promise<boolean>((resolve) => {
      const transaction = database.transaction([storeName], 'readonly');
      const request = transaction.objectStore(storeName).get('auth:user');
      request.onsuccess = () => {
        database.close();
        resolve(!!request.result?.value);
      };
      request.onerror = () => {
        database.close();
        resolve(false);
      };
    });
  }, { dbName: '__car_manager_db' });
}