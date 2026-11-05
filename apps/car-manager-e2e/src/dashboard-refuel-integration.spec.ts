// covers: docs/bugs/dashboard-refuel-visibility.md
import { test, expect } from '@playwright/test';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

test.describe('Dashboard – Integration: add refuel and verify visibility', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, {
      email: 'dash-int@carmanager.local',
      password: 'Password123!',
      displayName: 'Dash Integration',
    });
  });

  test('should show newly added refuel in recent list after submit', async ({ page }) => {
    // 1. Navigate to dashboard
    await navigateToDashboard(page);
    await waitForIonicPage(page);

    // 2. Verify empty state
    await expect(page.locator('[data-testid="empty-refuels"]')).toBeVisible({ timeout: 5000 });

    // 3. Click "Dodaj tankowanie" button
    await page.locator('[data-testid="btn-add-refuel"]').click();

    // 4. Wait for refuel form to load
    await page.waitForURL(/refuel-form/, { timeout: 10000 });
    await waitForIonicPage(page);
    await page.waitForTimeout(500);

    // 5. Fill refuel form using Ionic input controls
    // The refuel form has 4 ion-input fields: Data, Kwota, Przebieg, Litry
    const allInputs = page.locator('ion-input');
    await expect(allInputs.first()).toBeVisible({ timeout: 5000 });

    // Date is first input (type="date") — pre-filled with today's date, no need to change

    // Kwota (PLN) — second input, type="number"
    const amountInput = allInputs.nth(1).locator('input');
    await amountInput.fill('200');

    // Przebieg (km) — third input, type="number"
    const mileageInput = allInputs.nth(2).locator('input');
    await mileageInput.fill('50000');

    // 6. Submit the form
    const submitBtn = page.locator('ion-button:has-text("Zapisz tankowanie")').first();
    await expect(submitBtn).toBeEnabled({ timeout: 3000 });
    await submitBtn.click();

    // 7. Wait for navigation back to dashboard
    await page.waitForTimeout(1500);
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    await waitForIonicPage(page);

    // 8. Verify we are back on the dashboard
    await expect(page.locator('[data-testid="btn-add-refuel"]')).toBeVisible({ timeout: 8000 });

    // 9. Should have at least one recent refuel item
    const recentItems = page.locator('[data-testid="recent-refuel-item"]');
    await expect(recentItems.first()).toBeVisible({ timeout: 8000 });

    // Should show the amount and mileage
    const firstItem = recentItems.first();
    await expect(firstItem).toContainText('200,00');
    await expect(firstItem).toContainText('50000');

    // Empty state should no longer be visible
    await expect(page.locator('[data-testid="empty-refuels"]')).not.toBeVisible();
  });
});
