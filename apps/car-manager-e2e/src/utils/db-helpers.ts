import { type Page } from '@playwright/test';

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
 * Set a value in Ionic Storage by writing directly to the underlying
 * IndexedDB. Ionic Storage stores all keys in a single object store
 * with the key format: `_ionickv:<key>`.
 */
export async function setStorageItem(
  page: Page,
  key: string,
  value: unknown,
): Promise<void> {
  await page.evaluate(
    async ({ dbName, storageKey, storageValue }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Ionic Storage uses `_ionickv` as its store name
      const storeName = database.objectStoreNames[0] || '_ionickv';
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      store.put({ value: storageValue }, storageKey);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
      database.close();
    },
    { dbName: DB_NAME, storageKey: key, storageValue: value },
  );
}

/**
 * Get a value from Ionic Storage.
 */
export async function getStorageItem<T = unknown>(
  page: Page,
  key: string,
): Promise<T | null> {
  return page.evaluate(
    async ({ dbName, storageKey }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const storeName = database.objectStoreNames[0] || '_ionickv';

      return new Promise<T | null>((resolve, reject) => {
        const transaction = database.transaction([storeName], 'readonly');
        const request = transaction.objectStore(storeName).get(storageKey);
        request.onsuccess = () => {
          database.close();
          const result = request.result as { value?: T } | undefined;
          resolve(result?.value ?? null);
        };
        request.onerror = () => {
          database.close();
          reject(request.error);
        };
      });
    },
    { dbName: DB_NAME, storageKey: key },
  );
}

/**
 * Clear all data from Ionic Storage.
 */
export async function clearStorage(page: Page): Promise<void> {
  await page.evaluate(async ({ dbName }) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const storeName = database.objectStoreNames[0] || '_ionickv';
    const transaction = database.transaction([storeName], 'readwrite');
    transaction.objectStore(storeName).clear();

    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  }, { dbName: DB_NAME });
}

/**
 * Seed a car record into Ionic Storage.
 */
export async function seedCar(
  page: Page,
  car: { id: string; name: string; ownerId: string },
): Promise<void> {
  await setStorageItem(page, `car:${car.id}`, car);
}

/**
 * Seed a refuel record into Ionic Storage.
 */
export async function seedRefuel(
  page: Page,
  refuel: {
    id: string;
    carId: string;
    date: string;
    amount: number;
    mileage: number;
    liters?: number;
    isVerva?: boolean;
    createdBy: string;
  },
): Promise<void> {
  await setStorageItem(page, `refuel:${refuel.id}`, refuel);
}

/**
 * Seed a repair record into Ionic Storage.
 */
export async function seedRepair(
  page: Page,
  repair: {
    id: string;
    carId: string;
    date: string;
    amount: number;
    mileage: number;
    location: string;
    description: string;
    mechanicNote?: string;
    createdBy: string;
  },
): Promise<void> {
  await setStorageItem(page, `repair:${repair.id}`, repair);
}