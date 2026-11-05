// covers: docs/bugs/02-router-navigate-in-ionic.md
import { test, expect } from '@playwright/test';
import { seedAuthUser, clearAuthState, skipIfFirebaseUnavailable } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';
import { navigateToLogin } from './utils/navigation-helpers';

test.describe('Regresja nawigacji Ionic z dashboardu', () => {
  test.beforeAll(async () => await skipIfFirebaseUnavailable());
  test.afterEach(async ({ page }) => {
    await clearStorage(page).catch(() => undefined);
    await clearAuthState(page).catch(() => undefined);
  });

  test('kliknięcie karty tankowań zmienia aktywny widok, a przycisk wstecz przywraca dashboard', async ({
    page,
  }) => {
    // Arrange
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const email = `router-regression-${uniqueId}@carmanager.local`;
    const password = 'Password123!';

    await clearAuthState(page).catch(() => undefined);
    await clearStorage(page).catch(() => undefined);
    const seededUser = await seedAuthUser(page, {
      email,
      password,
      provisionCar: false,
    });
    await clearAuthState(page);
    await navigateToLogin(page);

    await page.locator('ion-input[name="email"] input').fill(seededUser.email);
    await page.locator('ion-input[name="password"] input').fill(seededUser.password);
    await page.getByRole('button', { name: /Zaloguj się/i }).click();

    await expect(page).toHaveURL(/\/add-car$/);
    const activeAddCar = page.locator('app-add-car.ion-page:not(.ion-page-hidden)');
    await activeAddCar.getByTestId('car-name-input').locator('input').fill('Auto regresyjne');
    await expect(activeAddCar.getByTestId('add-car-button')).toBeEnabled();
    await activeAddCar.getByTestId('car-name-input').locator('input').press('Enter');

    const dashboardHeading = page.getByRole('heading', { name: /Tankowania/i });
    const emptyRefuelList = page.locator('.refuel-list__empty');
    const emptyRepairList = page.locator('.repair-list__empty');
    const activeDashboard = page.locator('app-dashboard.ion-page:not(.ion-page-hidden)');
    const activeRefuelList = page.locator('app-refuel-list.ion-page:not(.ion-page-hidden)');

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading).toBeVisible();
    await expect(activeDashboard).toBeVisible();

    // Act: navigate to refuel-list via programmatic route.
    await page.evaluate(() => {
      const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
      return (e2e.navigateTo as (path: string) => Promise<unknown>)('/refuel-list');
    });
    await page.waitForURL(/\/refuel-list$/);

    // Assert
    await expect(page).toHaveURL(/\/refuel-list$/);
    await expect(emptyRefuelList).toBeVisible();
    await expect(dashboardHeading).not.toBeVisible();
    await expect(activeRefuelList).toBeVisible();
    await expect(activeDashboard).toHaveCount(0);

    // Act
    await activeRefuelList.locator('ion-back-button').click();

    // Assert
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading).toBeVisible();
    await expect(activeDashboard).toBeVisible();
    await expect(emptyRefuelList).not.toBeVisible();

    // Act: navigate to repair-list via programmatic route.
    await page.evaluate(() => {
      const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
      return (e2e.navigateTo as (path: string) => Promise<unknown>)('/repair-list');
    });
    await page.waitForURL(/\/repair-list$/);

    // Assert
    await expect(emptyRepairList).toBeVisible();
    await expect(dashboardHeading).not.toBeVisible();
    await expect(page.locator('app-repair-list.ion-page:not(.ion-page-hidden)')).toBeVisible();
    await expect(activeDashboard).toHaveCount(0);
  });
});
