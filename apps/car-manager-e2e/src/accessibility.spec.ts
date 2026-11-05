// covers: docs/specs/accessibility/static-audit.md
// Accessibility audit tests using @axe-core/playwright
import { test, expect } from '@playwright/test';
import { checkAccessibility } from './utils/accessibility-helpers';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

const TEST_USER = {
  email: 'a11y-test@carmanager.local',
  password: 'Password123!',
  displayName: 'A11y Test User',
};

test.describe('Accessibility – Statyczny audyt a11y', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, TEST_USER);
  });

  test('Dashboard – 0 naruszeń a11y (critical/serious) @a11y', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await page.waitForTimeout(500); // Allow Ionic page transitions to settle
    await checkAccessibility(page);
  });

  test('Dashboard – 0 naruszeń a11y (wszystkie poziomy) @a11y', async ({ page }) => {
    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await page.waitForTimeout(500);
    await checkAccessibility(page, {
      includedImpacts: ['critical', 'serious', 'moderate', 'minor'],
    });
  });
});

test.describe('Accessibility – Formularze', () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, TEST_USER);
  });

  test('Refuel form – 0 naruszeń a11y @a11y', async ({ page }) => {
    await page.goto('/refuel-form');
    await waitForIonicPage(page);
    await page.waitForTimeout(500);
    await checkAccessibility(page);
  });

  test('Repair form – 0 naruszeń a11y @a11y', async ({ page }) => {
    await page.goto('/repair-form');
    await waitForIonicPage(page);
    await page.waitForTimeout(500);
    await checkAccessibility(page);
  });
});
