// covers: docs/bugs/02-router-navigate-in-ionic.md
import { test, expect } from '@playwright/test';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';
import { navigateToLogin } from './utils/navigation-helpers';

test.describe('Regresja nawigacji Ionic z dashboardu', () => {
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
    const activeAddCar = page.locator(
      'app-add-car.ion-page:not(.ion-page-hidden)'
    );
    await activeAddCar
      .getByTestId('car-name-input')
      .locator('input')
      .fill('Auto regresyjne');
    await expect(activeAddCar.getByTestId('add-car-button')).toBeEnabled();
    await activeAddCar
      .getByTestId('car-name-input')
      .locator('input')
      .press('Enter');

    const dashboardHeading = page.getByRole('heading', { name: /Tankowania/i });
    const emptyRefuelList = page.getByText('Brak tankowań – dodaj pierwsze!', {
      exact: true,
    });
    const emptyRepairList = page.getByText('Brak napraw – dodaj pierwszą!', {
      exact: true,
    });
    const activeDashboard = page.locator(
      'app-dashboard.ion-page:not(.ion-page-hidden)'
    );
    const activeRefuelList = page.locator(
      'app-refuel-list.ion-page:not(.ion-page-hidden)'
    );

    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(dashboardHeading).toBeVisible();
    await expect(activeDashboard).toBeVisible();

    // Act: use the real dashboard card click, not window.__e2e__.navigateTo.
    await page.getByTestId('card-refuel').click();

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

    // Act: verify that the same outlet transition works for the other card.
    await page.getByTestId('card-repair').click();

    // Assert
    await expect(page).toHaveURL(/\/repair-list$/);
    await expect(emptyRepairList).toBeVisible();
    await expect(dashboardHeading).not.toBeVisible();
    await expect(
      page.locator('app-repair-list.ion-page:not(.ion-page-hidden)')
    ).toBeVisible();
    await expect(activeDashboard).toHaveCount(0);
  });
});
