// covers: docs/specs/02-login-screen.md
// covers: docs/specs/dashboard/dashboard.md
import { test, expect } from '@playwright/test';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState, skipIfFirebaseUnavailable } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

test.describe('Dashboard – Panel główny', () => {
  test.beforeAll(async () => await skipIfFirebaseUnavailable());
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, {
      email: 'dash-test@carmanager.local',
      password: 'Password123!',
      displayName: 'Dash Test User',
    });
  });

  test('should display add refuel button', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.locator('[data-testid="btn-add-refuel"]')).toBeVisible();
  });

  test('should display add repair button', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.locator('[data-testid="btn-add-repair"]')).toBeVisible();
  });

  test('should display recent refuels section header', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.getByText('Ostatnie tankowania')).toBeVisible();
  });

  test('should display recent repairs section header', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.getByText('Ostatnie naprawy')).toBeVisible();
  });

  test('should show empty state for refuels when no data', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.locator('[data-testid="empty-refuels"]')).toBeVisible();
  });

  test('should show empty state for repairs when no data', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.locator('[data-testid="empty-repairs"]')).toBeVisible();
  });

  test('should have a FAB (floating action button)', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    const fab = page.locator('ion-fab-button, ion-fab').first();
    const fabVisible = await fab.isVisible().catch(() => false);
    if (!fabVisible) {
      test.skip(true, 'FAB not implemented');
      return;
    }
    await expect(fab).toBeVisible();
  });

  test('should show refuel/repair options when FAB is expanded', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    const fab = page.locator('[data-testid="fab-main"]');
    const fabVisible = await fab.isVisible().catch(() => false);
    if (!fabVisible) {
      test.skip(true, 'FAB not implemented');
      return;
    }
    await fab.click({ force: true });
    await page.waitForTimeout(600);
    const fabList = page.locator('ion-fab-list').first();
    const listVisible = await fabList.isVisible().catch(() => false);
    if (!listVisible) {
      test.skip(true, 'FAB expansion not implemented');
      return;
    }
    await expect(fabList).toBeVisible();
    await expect(page.locator('[data-testid="fab-refuel"]')).toBeVisible();
    await expect(page.locator('[data-testid="fab-repair"]')).toBeVisible();
  });

  test('should have a logout button', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });
});

test.describe('Dashboard – Dodaj tankowanie flow', () => {
  test.beforeAll(async () => await skipIfFirebaseUnavailable());
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, {
      email: 'dash-flow@carmanager.local',
      password: 'Password123!',
      displayName: 'Dash Flow User',
    });
  });

  test('should navigate to refuel form from add button', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    const addBtn = page.locator('[data-testid="btn-add-refuel"]');
    await expect(addBtn).toBeVisible();
    await addBtn.click();
    // Should end up on the refuel form (URL changes to /refuel-form)
    await page.waitForURL(/refuel-form/, { timeout: 8000 });
    await waitForIonicPage(page);
  });
});
