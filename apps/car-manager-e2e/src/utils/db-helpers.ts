import type { Page } from '@playwright/test';

/**
 * Ionic Storage e2e helpers for Car Manager.
 *
 * Car Manager uses @ionic/storage (backed by IndexedDB) for offline-first
 * persistence. These helpers manipulate the underlying IndexedDB directly
 * from Playwright's browser context to seed/clear test data.
 *
 * Note: Ionic Storage prepends prefixes to keys internally. The database
 * name is '__car_manager_db' as configured in app.config.ts.
 */

const DB_NAME = '__car_manager_db';

/**
 * Clear all data from Ionic Storage.
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(
    async ({ dbName }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      });

      const storeName = database.objectStoreNames[0] || '_ionickv';
      const transaction = database.transaction([storeName], 'readwrite');
      transaction.objectStore(storeName).clear();

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      });
      database.close();
    },
    { dbName: DB_NAME },
  );
}
