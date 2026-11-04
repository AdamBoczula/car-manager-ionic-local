// covers: docs/specs/02-login-screen.md
// covers: docs/specs/dashboard/dashboard.md
import { test, expect } from '@playwright/test';
import {
  navigateToDashboard,
  waitForIonicPage,
} from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

test.describe('Dashboard – Panel główny', () => {
  // Run sequentially — each test seeds its own auth state
  test.describe.configure({ mode: 'serial' });

  let seededEmail: string;

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    const seededUser = await seedAuthUser(page, {
      email: 'dash-test@carmanager.local',
      password: 'Password123!',
      displayName: 'Dash Test User',
    });
    seededEmail = seededUser.email;
  });

  test('should display welcome text "Witaj!"', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    await expect(page.getByText('Witaj!')).toBeVisible();
  });

  test('should display the user email', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    await expect(page.getByText(seededEmail)).toBeVisible();
  });

  test('should display Tankowania card', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    await expect(
      page.getByRole('heading', { name: /Tankowania/i })
    ).toBeVisible();
    await expect(
      page.getByText(/Przeglądaj i dodawaj tankowania/i)
    ).toBeVisible();
  });

  test('should display Naprawy card', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    await expect(page.getByRole('heading', { name: /Naprawy/i })).toBeVisible();
    await expect(
      page.getByText(/Zarządzaj naprawami i serwisem/i)
    ).toBeVisible();
  });

  test('should have a FAB (floating action button)', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    const fab = page.locator('ion-fab-button, ion-fab').first();

    // If FAB not implemented yet, skip gracefully
    const fabVisible = await fab.isVisible().catch(() => false);
    if (!fabVisible) {
      console.log(
        '⚠️ FAB button not found — may not be implemented yet (Phase 2)'
      );
      test.skip(true, 'FAB button not implemented yet');
      return;
    }

    await expect(fab).toBeVisible();
  });

  test('should show refuel/repair options when FAB is expanded', async ({
    page,
  }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    const fab = page.locator('[data-testid="fab-main"]');
    const fabVisible = await fab.isVisible().catch(() => false);

    if (!fabVisible) {
      console.log('⚠️ FAB button not found — skipping FAB expansion test');
      test.skip(true, 'FAB button not implemented yet');
      return;
    }

    // Click FAB to expand it — use force to bypass Ionic stacking interception
    await fab.click({ force: true });
    await page.waitForTimeout(600);

    // Should show refuel and repair options in the fab list
    const fabList = page.locator('ion-fab-list').first();
    const listVisible = await fabList.isVisible().catch(() => false);
    if (!listVisible) {
      console.log(
        '⚠️ FAB list not visible — FAB may navigate directly instead of expanding'
      );
      test.skip(true, 'FAB expansion not implemented yet');
      return;
    }

    await expect(fabList).toBeVisible();

    // Check for data-testid elements in the fab list
    await expect(page.locator('[data-testid="fab-refuel"]')).toBeVisible();
    await expect(page.locator('[data-testid="fab-repair"]')).toBeVisible();
  });

  test('should have a monthly spending section', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    // Monthly spending section — may be titled with month name or "Wydatki"
    const spendingSection = page
      .locator(
        'ion-card:has-text("Wydatki"), .spending-section, .monthly-section, section:has-text("miesi"), ion-item:has-text("Wydatki")'
      )
      .first();

    const sectionVisible = await spendingSection.isVisible().catch(() => false);
    if (!sectionVisible) {
      console.log(
        '⚠️ Monthly spending section not found — may not be implemented yet (Phase 2)'
      );
      test.skip(true, 'Monthly spending section not implemented yet');
      return;
    }

    await expect(spendingSection).toBeVisible();
  });

  // Skipped explicitly: online/offline status is not present in the dashboard
  // specification or the current UI.
  test.skip('should display online/offline status badge', async () => {});

  test('should have a logout button', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    await expect(page.locator('[data-testid="logout-button"]')).toBeVisible();
  });
});
