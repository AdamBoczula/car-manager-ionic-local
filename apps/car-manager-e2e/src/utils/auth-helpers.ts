import { type Page } from '@playwright/test';

/**
 * Firebase Auth test helpers for Car Manager e2e tests.
 *
 * These helpers bypass the real Firebase Auth flow by directly manipulating
 * the app's IndexedDB (Ionic Storage). This avoids hitting Firebase servers,
 * needing real credentials, or dealing with rate-limits during tests.
 *
 * The Ionic Storage database '__car_manager_db' uses a single object store
 * named '_ionickv'. Keys use the format '_ionickv:<key>'.
 */

const DB_NAME = '__car_manager_db';
const STORE_NAME = '_ionickv';

/**
 * Seed an authenticated user profile into Ionic Storage.
 * Navigates to the app first to ensure the IndexedDB context is available.
 */
export async function seedAuthUser(
  page: Page,
  user: {
    uid: string;
    email: string;
    displayName?: string;
  },
): Promise<void> {
  // Navigate to the app so IndexedDB context initializes
  await page.goto('/').catch(() => {});
  await page.waitForTimeout(800);

  await page.evaluate(
    async ({ dbName, storeName, userData }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (event) => {
          // Create the store if it doesn't exist
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
      });

      // Ensure store exists after open
      if (!database.objectStoreNames.contains(storeName)) {
        // Close and reopen with higher version to trigger onupgradeneeded
        database.close();
        const upgraded = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open(dbName, database.version + 1);
          req.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(storeName)) {
              db.createObjectStore(storeName);
            }
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });
        upgraded.close();
        // Reopen normally
        return;
      }

      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Store user profile in Ionic Storage format: _ionickv:key → { value }
      store.put(
        { value: userData },
        `_ionickv:auth:user`,
      );

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    { dbName: DB_NAME, storeName: STORE_NAME, userData: user },
  );
}

/**
 * Clear the auth state from Ionic Storage (simulate logout).
 */
export async function clearAuthState(page: Page): Promise<void> {
  await page.goto('/').catch(() => {});
  await page.waitForTimeout(300);

  await page.evaluate(async ({ dbName, storeName }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!database.objectStoreNames.contains(storeName)) {
      database.close();
      return;
    }

    const transaction = database.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);

    // Delete auth-related keys
    store.delete('_ionickv:auth:user');

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { dbName: DB_NAME, storeName: STORE_NAME });
}

/**
 * Check if a user is authenticated by reading from Ionic Storage.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(async ({ dbName, storeName }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!database.objectStoreNames.contains(storeName)) {
      database.close();
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const transaction = database.transaction([storeName], 'readonly');
      const request = transaction.objectStore(storeName).get('_ionickv:auth:user');
      request.onsuccess = () => {
        database.close();
        resolve(!!request.result?.value);
      };
      request.onerror = () => {
        database.close();
        resolve(false);
      };
    });
  }, { dbName: DB_NAME, storeName: STORE_NAME });
}