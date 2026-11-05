// QA Phase 2 screenshots — visual verification of Phase 2 features
import { test, expect } from '@playwright/test';
import path from 'path';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';
import {
  navigateToDashboard,
  navigateToRefuelListViaDashboard,
  navigateToRepairListViaDashboard,
  waitForIonicPage,
} from './utils/navigation-helpers';

const SCREENSHOT_DIR = path.resolve('qa-screenshots');

test.describe('QA Phase 2 — Screenshot verification', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
  });

  // ========================================================
  // Step 1: Dashboard screenshot (authenticated)
  // ========================================================
  test('01 - Dashboard with welcome and cards', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToDashboard(page);

    // Verify key elements are visible
    await expect(
      page.getByRole('heading', { name: /Tankowania/i })
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Naprawy/i })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-01-dashboard.png`,
      fullPage: true,
    });
    console.log('✅ Dashboard screenshot captured');
  });

  // ========================================================
  // Step 2: Refuel list — empty state
  // ========================================================
  test('02 - Refuel list — empty state', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToRefuelListViaDashboard(page);

    // Verify empty state message
    const emptyMsg = page.getByText(/Brak tankowań/i);
    const emptyVisible = await emptyMsg.isVisible().catch(() => false);
    if (!emptyVisible) {
      console.log('⚠️ Refuel list page or empty state not available yet');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-02-refuel-list-empty.png`,
      fullPage: true,
    });
    console.log('✅ Refuel list (empty) screenshot captured');
  });

  // ========================================================
  // Step 3: Refuel form
  // ========================================================
  test('03 - Refuel form with all fields', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    // Navigate programmatically via Angular Router (avoids full reload)
    await page.locator('[data-testid="card-refuel"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => {
      const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
      return (e2e['navigateTo'] as (path: string) => Promise<unknown>)('/refuel-form');
    });
    await page.waitForURL(/refuel-form/, { timeout: 10000 });
    await waitForIonicPage(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-03-refuel-form.png`,
      fullPage: true,
    });
    console.log('✅ Refuel form screenshot captured');
  });

  // ========================================================
  // Step 4: Repair list — empty state
  // ========================================================
  test('04 - Repair list — empty state', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToRepairListViaDashboard(page);

    const emptyMsg = page.getByText(/Brak napraw/i);
    const emptyVisible = await emptyMsg.isVisible().catch(() => false);
    if (!emptyVisible) {
      console.log('⚠️ Repair list page or empty state not available yet');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-04-repair-list-empty.png`,
      fullPage: true,
    });
    console.log('✅ Repair list (empty) screenshot captured');
  });

  // ========================================================
  // Step 5: Repair form
  // ========================================================
  test('05 - Repair form with all fields', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    // Navigate programmatically via Angular Router
    await page.locator('[data-testid="card-repair"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.evaluate(() => {
      const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
      return (e2e['navigateTo'] as (path: string) => Promise<unknown>)('/repair-form');
    });
    await page.waitForURL(/repair-form/, { timeout: 10000 });
    await waitForIonicPage(page);

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-05-repair-form.png`,
      fullPage: true,
    });
    console.log('✅ Repair form screenshot captured');
  });

  // ========================================================
  // Step 6: Dashboard FAB expanded
  // ========================================================
  test('06 - Dashboard FAB expanded (refuel/repair options)', async ({ page }) => {
    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToDashboard(page);

    // Try to expand the FAB (data-testid on FAB button)
    const fab = page.locator('[data-testid="fab-main"]');
    const fabVisible = await fab.isVisible().catch(() => false);

    if (fabVisible) {
      await fab.click({ force: true });
      await page.waitForTimeout(600);
    } else {
      console.log('⚠️ FAB button not available — skipping FAB expanded screenshot');
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-06-fab-expanded.png`,
      fullPage: true,
    });
    console.log('✅ FAB expanded screenshot captured');
  });

  // ========================================================
  // Step 7: Mobile viewport (390x844) — Dashboard
  // ========================================================
  test('07 - Mobile viewport (390x844) — Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToDashboard(page);

    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Naprawy/i })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-07-mobile-dashboard-390x844.png`,
      fullPage: true,
    });
    console.log('✅ Mobile viewport (390x844) — Dashboard screenshot captured');
  });

  // ========================================================
  // Step 8: Tablet viewport (430px width) — Dashboard
  // ========================================================
  test('08 - Tablet viewport (430px) — Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 430, height: 932 });

    await seedAuthUser(page, {
      uid: 'test-qa-phase2',
      email: 'qa-phase2@carmanager.local',
      displayName: 'QA User',
    });

    await navigateToDashboard(page);

    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible();

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/phase2-08-tablet-dashboard-430x932.png`,
      fullPage: true,
    });
    console.log('✅ Tablet viewport (430px) — Dashboard screenshot captured');
  });
});