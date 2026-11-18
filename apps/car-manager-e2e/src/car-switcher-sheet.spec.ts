// covers: docs/bugs/05-sheet-modal-offscreen-submit.md
//
// Regression test for the bottom sheet that opened at breakpoint 0.55 with
// breakpoints [0, 0.55] — no higher breakpoint existed, so the sheet could not
// be expanded and the "Dodaj auto" button rendered ~294px below the viewport
// with no way to reach it.
//
// Requires the Firebase Auth Emulator for reliable IndexedDB seeding.
// Run locally with: `npx firebase emulators:start`
import { test, expect, type Page } from '@playwright/test';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState, skipIfFirebaseUnavailable } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

/** Short phone viewport — the worst case for a sheet modal footer. */
const PHONE_VIEWPORT = { width: 390, height: 664 } as const;

test.describe('Car switcher – sheet modal reachability', () => {
  test.use({ viewport: PHONE_VIEWPORT });
  test.beforeAll(async () => await skipIfFirebaseUnavailable());

  async function openAddCarSheet(page: Page): Promise<void> {
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
    await seedAuthUser(page, {
      email: 'sheet-modal@carmanager.local',
      password: 'Password123!',
      displayName: 'Sheet Modal Test',
    });

    await navigateToDashboard(page);
    await waitForIonicPage(page);
    await expect(page.getByRole('heading', { name: /Tankowania/i })).toBeVisible({
      timeout: 15000,
    });
    await page.waitForTimeout(1000);

    await page.getByTestId('car-switcher-button').click();
    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible({ timeout: 5000 });
    await popover.getByText('Dodaj auto', { exact: true }).click();
    await page.waitForTimeout(1000);
  }

  test('add-car sheet can be expanded so the submit button is on-screen', async ({ page }) => {
    await openAddCarSheet(page);

    const submit = page.locator('[data-testid="add-car-submit"]');
    await expect(submit).toBeVisible({ timeout: 10000 });

    // Expand the sheet to its top breakpoint — the action a user would take
    // by dragging the handle, driven through Ionic's public API for determinism.
    await page.evaluate(async () => {
      const modal = document.querySelector('ion-modal.show-modal') as HTMLElement & {
        setCurrentBreakpoint?: (breakpoint: number) => Promise<void>;
      };
      await modal?.setCurrentBreakpoint?.(1);
    });
    await page.waitForTimeout(1000);

    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE_VIEWPORT.height);
  });

  test('add-car sheet exposes a higher breakpoint than its initial one', async ({ page }) => {
    await openAddCarSheet(page);

    // Guard against the original config `[0, 0.55]`, which left no room to grow.
    const breakpoints = await page.evaluate(() => {
      const modal = document.querySelector('ion-modal.show-modal') as HTMLElement & {
        breakpoints?: number[];
      };
      return modal?.breakpoints ?? [];
    });

    const initial = await page.evaluate(() => {
      const modal = document.querySelector('ion-modal.show-modal') as HTMLElement & {
        initialBreakpoint?: number;
      };
      return modal?.initialBreakpoint ?? 0;
    });

    expect(breakpoints.some((b) => b > initial)).toBe(true);
    expect(breakpoints.some((b) => b >= 0.9)).toBe(true);
  });
});
