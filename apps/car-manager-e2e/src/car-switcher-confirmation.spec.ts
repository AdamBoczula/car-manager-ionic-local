// covers: docs/bugs/01-car-switcher-confirmation-redirect.md
// covers: docs/bugs/03-list-car-switcher-and-repair-back.md
import { test, expect, type Page } from '@playwright/test';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

// ── Types ──

interface SeedCar {
  readonly id: string;
  readonly name: string;
  readonly ownerId: string;
  readonly createdAt: string;
}

// ── Constants ──

const DB_NAME = '__car_manager_db';

const TEST_USER = {
  email: 'car-switch-test@carmanager.local',
  password: 'Password123!',
  displayName: 'Car Switch Test User',
} as const;

const CAR_1: SeedCar = {
  id: 'car-1-test',
  name: 'Toyota Corolla',
  ownerId: 'placeholder',
  createdAt: '2025-01-01T00:00:00.000Z',
};

const CAR_2: SeedCar = {
  id: 'car-2-test',
  name: 'Honda Civic',
  ownerId: 'placeholder',
  createdAt: '2025-01-02T00:00:00.000Z',
};

// ── Helpers ──

/**
 * Seed the car list into Ionic Storage using localForage's IndexedDB format.
 *
 * CarService stores the full cars array under key `cars:<uid>`.
 * localForage stores both the key and value directly in the `_ionickv` object
 * store; `_ionickv` is the store name, not a key prefix.
 *
 * PREREQUISITE: Ionic Storage must already be initialized (object store exists
 * in IndexedDB). This happens after the dashboard finishes loading because
 * DashboardPage.ngOnInit() calls storage.init().
 */
async function seedCarList(page: Page, uid: string, cars: readonly SeedCar[]): Promise<void> {
  const seeded = cars.map((c) => ({ ...c, ownerId: uid }));

  await page.evaluate(
    async ({ dbName, uid, cars: carsData }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      });

      if (database.objectStoreNames.length === 0) {
        database.close();
        throw new Error('No object stores in IndexedDB — Ionic Storage not initialized yet.');
      }

      const storeName = database.objectStoreNames[0];
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      store.put(carsData, `cars:${uid}`);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      });
      database.close();
    },
    { dbName: DB_NAME, uid, cars: seeded },
  );
}

/**
 * Seed the active car ID into Ionic Storage.
 * CarService persists active car under key `active_car:<uid>`.
 *
 * PREREQUISITE: Ionic Storage must already be initialized.
 */
async function seedActiveCarId(page: Page, uid: string, carId: string): Promise<void> {
  await page.evaluate(
    async ({ dbName, uid, carId }) => {
      const database = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
      });

      if (database.objectStoreNames.length === 0) {
        database.close();
        throw new Error('No object stores in IndexedDB — Ionic Storage not initialized yet.');
      }

      const storeName = database.objectStoreNames[0];
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      store.put(carId, `active_car:${uid}`);

      await new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      });
      database.close();
    },
    { dbName: DB_NAME, uid, carId },
  );
}

// ── Tests ──

test.describe('CarSwitcher – zmiana auta z potwierdzeniem', () => {
  test.describe.configure({ mode: 'serial' });
  let seededEmail: string;

  test.beforeEach(async ({ page }) => {
    // ── Phase 1: Authenticate using the proven seedAuthUser helper ──
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});

    // Provisioning one temporary car completes the first-use wizard and also
    // initializes Ionic Storage. The temporary local list is replaced below.
    const seededUser = await seedAuthUser(page, TEST_USER);
    seededEmail = seededUser.email;

    // Navigate to dashboard and wait for it to fully render
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    // Verify the dashboard is actually rendered — also confirms
    // that storage.init() has been called, creating the IndexedDB object store
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible({
      timeout: 10000,
    });

    // ── Phase 2: Replace the temporary car in initialized Ionic Storage ──
    await seedCarList(page, seededUser.uid, [CAR_1, CAR_2]);
    await seedActiveCarId(page, seededUser.uid, CAR_1.id);

    // ── Phase 3: Reload to pick up seeded cars ──
    // On reload: Angular boots fresh → Firebase re-authenticates from
    // persisted state → AppComponent effect detects login → calls
    // carService.startListening() → loads seeded cars from storage
    await page.reload({ waitUntil: 'domcontentloaded' });

    // Wait for dashboard to load again, this time with the seeded cars
    await page.waitForURL(/dashboard/, { timeout: 15000 });
    await waitForIonicPage(page);
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show confirmation alert when selecting a different car, then navigate to dashboard with correct content', async ({
    page,
  }) => {
    // ── Arrange: verify CarSwitcher shows the active car ──
    const switcherButton = page.getByTestId('car-switcher-button');
    await expect(switcherButton).toBeVisible({ timeout: 5000 });
    await expect(switcherButton).toContainText(CAR_1.name);

    // ── Act 1: open the popover by clicking the CarSwitcher button ──
    await switcherButton.click();

    // Wait for popover content to appear
    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible({ timeout: 5000 });

    // Verify both cars are listed in the popover
    const carOptions = page.getByTestId('car-option');
    await expect(carOptions).toHaveCount(2);
    await expect(carOptions.nth(0)).toContainText(CAR_1.name);
    await expect(carOptions.nth(1)).toContainText(CAR_2.name);

    // ── Act 2: select the SECOND car (different from active) ──
    await carOptions.nth(1).click();

    // ── Assert 1: confirmation alert appears ──
    const alert = page.locator('ion-alert:visible');
    await expect(alert).toBeVisible({ timeout: 5000 });

    // Alert should contain the confirmation message with the target car name
    await expect(alert).toContainText(`Czy na pewno chcesz zmienić auto na ${CAR_2.name}`);

    // Alert should have two buttons: "Nie" (cancel) and "Tak" (confirm)
    const alertButtons = alert.locator('.alert-button');
    await expect(alertButtons).toHaveCount(2);

    // ── Act 3: confirm the car change by clicking "Tak" ──
    await alert.getByRole('button', { name: /Tak/i }).click();

    // ── Assert 2: alert closes ──
    await expect(alert).not.toBeVisible({ timeout: 5000 });

    // ── Assert 3: URL is /dashboard ──
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });

    // ── Assert 4: PAGE CONTENT is dashboard (not stale content) ──
    // This is the critical check from the bug doc: in Ionic+Angular, URL can
    // change while the view content remains stale. We verify the actual
    // dashboard content is rendered, not just the URL.
    await waitForIonicPage(page);

    // Dashboard heading
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible({ timeout: 5000 });

    // Tankowania card
    // The Ionic overlay can keep the underlying page aria-hidden while its
    // leave animation settles, so assert the rendered text rather than role.
    await expect(page.getByText('Ostatnie tankowania')).toBeVisible({
      timeout: 5000,
    });

    // Naprawy section header
    await expect(page.getByText('Ostatnie naprawy')).toBeVisible({
      timeout: 5000,
    });

    // The selected car is active after the confirmation handler completes.
    await expect(switcherButton).toContainText(CAR_2.name);
  });

  test('should cancel car change when clicking "Nie" in confirmation alert', async ({ page }) => {
    // ── Arrange: verify initial state ──
    const switcherButton = page.getByTestId('car-switcher-button');
    await expect(switcherButton).toBeVisible({ timeout: 5000 });
    await expect(switcherButton).toContainText(CAR_1.name);

    // ── Act 1: open popover and select different car ──
    await switcherButton.click();

    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible({ timeout: 5000 });

    await page.getByTestId('car-option').nth(1).click();

    // ── Assert 1: confirmation alert appears ──
    const alert = page.locator('ion-alert:visible');
    await expect(alert).toBeVisible({ timeout: 5000 });
    await expect(alert).toContainText(`Czy na pewno chcesz zmienić auto na ${CAR_2.name}`);

    // ── Act 2: cancel the change by clicking "Nie" ──
    await alert.getByRole('button', { name: /Nie/i }).click();

    // ── Assert 2: alert closes ──
    await expect(alert).not.toBeVisible({ timeout: 5000 });

    // ── Assert 3: we remain on the dashboard (URL unchanged) ──
    await expect(page).toHaveURL(/dashboard/, { timeout: 5000 });

    // ── Assert 4: the active car is STILL Toyota Corolla (no change) ──
    await expect(switcherButton).toContainText(CAR_1.name);

    // ── Assert 5: dashboard content is still intact ──
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible({ timeout: 5000 });
  });

  test('should not show confirmation alert when selecting the same (already active) car', async ({
    page,
  }) => {
    // ── Arrange ──
    const switcherButton = page.getByTestId('car-switcher-button');
    await expect(switcherButton).toBeVisible({ timeout: 5000 });
    await expect(switcherButton).toContainText(CAR_1.name);

    // Open popover
    await switcherButton.click();

    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible({ timeout: 5000 });

    // ── Act: select the SAME car (already active) ──
    await page.getByTestId('car-option').nth(0).click();

    // ── Assert 1: NO alert appears (same car, no confirmation needed) ──
    const alert = page.locator('ion-alert:visible');
    await expect(alert).not.toBeVisible({ timeout: 2000 });
    await expect(page.locator('ion-popover:visible')).toHaveCount(0);

    // ── Assert 2: no navigation/reload, dashboard content stays intact ──
    await expect(page).toHaveURL(/dashboard/);
    await expect(switcherButton).toContainText(CAR_1.name);
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible();
  });

  for (const list of [
    {
      cardTestId: 'btn-add-refuel',
      route: '/refuel-list',
      pageSelector: 'app-refuel-list',
      emptyText: 'Brak tankowań – dodaj pierwsze!',
      emptyTestId: null,
    },
    {
      cardTestId: 'btn-add-repair',
      route: '/repair-list',
      pageSelector: 'app-repair-list',
      emptyText: 'Brak napraw – dodaj pierwszą!',
      emptyTestId: null,
    },
  ] as const) {
    test(`should close the popover and reload ${list.route} after changing car`, async ({
      page,
    }) => {
      await page.evaluate((route) => {
        const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<
          string,
          unknown
        >;
        return (e2e.navigateTo as (path: string) => Promise<unknown>)(route);
      }, list.route);
      await expect(page).toHaveURL(new RegExp(`${list.route}$`));

      const activePage = page.locator(`${list.pageSelector}.ion-page:not(.ion-page-hidden)`);
      const switcherButton = activePage.getByTestId('car-switcher-button');
      await expect(switcherButton).toContainText(CAR_1.name);

      await switcherButton.click();
      const visiblePopover = page.locator('ion-popover:visible');
      await expect(visiblePopover).toBeVisible();
      await visiblePopover.getByTestId('car-option').nth(1).click();

      const alert = page.locator('ion-alert:visible');
      await expect(alert).toContainText(CAR_2.name);
      await alert.getByRole('button', { name: /Tak/i }).click();

      await expect(page).toHaveURL(new RegExp(`${list.route}$`));
      await expect(
        page.locator(`${list.pageSelector}.ion-page:not(.ion-page-hidden)`),
      ).toBeVisible();
      await expect(page.locator('ion-popover:visible')).toHaveCount(0);
      await expect(
        page
          .locator(`${list.pageSelector}.ion-page:not(.ion-page-hidden)`)
          .getByTestId('car-switcher-button'),
      ).toContainText(CAR_2.name);
      await expect(
        page
          .locator(`${list.pageSelector}.ion-page:not(.ion-page-hidden)`)
          .getByText(list.emptyText, { exact: true }),
      ).toBeVisible();
    });
  }

  test('should return from repair list to the dashboard with the back button', async ({ page }) => {
    await page.evaluate(() => {
      const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
      return (e2e.navigateTo as (path: string) => Promise<unknown>)('/repair-list');
    });
    await page.waitForURL(/\/repair-list$/);

    const activeRepairList = page.locator('app-repair-list.ion-page:not(.ion-page-hidden)');
    await activeRepairList.locator('ion-back-button').click();

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible();
    await expect(page.locator('app-dashboard.ion-page:not(.ion-page-hidden)')).toBeVisible();
  });
});
