// covers: docs/bugs/06-sheet-modal-offscreen-submit.md
// covers: docs/bugs/10-native-keyboard-integration.md#AC-6
//
// Regression test for the add-car dialog on the worst-case phone viewport.
//
// History: the dialog used to be a bottom sheet that opened at breakpoint 0.55
// with breakpoints [0, 0.55] — no higher breakpoint existed, so the sheet could
// not be expanded and "Dodaj auto" rendered ~294px below the viewport. A later
// fix added higher breakpoints, and the dialog is now a self-sizing card modal
// with no breakpoints at all (docs/bugs/10).
//
// The contract asserted here is the current one: the dialog has no breakpoint
// configuration and still puts the submit button fully on screen — the original
// user-facing symptom of bug 06. Layout details and keyboard behaviour live in
// `car-switcher-sheet-scroll.spec.ts`; this spec only drives the Firebase-backed
// dashboard.
//
// Requires the Firebase Auth Emulator for reliable IndexedDB seeding.
// Run locally with: `npx firebase emulators:start`
import { test, expect, type Page } from '@playwright/test';
import { navigateToDashboard, waitForIonicPage } from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState, skipIfFirebaseUnavailable } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

/** Short phone viewport — the worst case for a dialog submit button. */
const PHONE_VIEWPORT = { width: 390, height: 664 } as const;

test.describe('Car switcher – add-car dialog reachability', () => {
  test.use({ viewport: PHONE_VIEWPORT });
  test.beforeAll(async () => await skipIfFirebaseUnavailable());

  async function openAddCarDialog(page: Page): Promise<void> {
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

  test('add-car dialog shows the submit button without expanding anything', async ({ page }) => {
    await openAddCarDialog(page);

    // No expand gesture, no programmatic breakpoint call: the button must be
    // reachable immediately.
    const submit = page.locator('[data-testid="add-car-submit"]');
    await expect(submit).toBeVisible({ timeout: 10000 });
    await expect(submit).toBeInViewport({ ratio: 1 });

    const box = await submit.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE_VIEWPORT.height);
  });

  // covers: docs/bugs/10-native-keyboard-integration.md#AC-6
  test('add-car dialog no longer relies on breakpoints', async ({ page }) => {
    await openAddCarDialog(page);

    // Bug 06 was fixed by adding breakpoints; bug 10 replaced the sheet with a
    // content-sized card, so a breakpoint configuration is now the regression.
    const config = await page.evaluate(() => {
      const modal = document.querySelector('ion-modal.show-modal') as HTMLElement & {
        breakpoints?: number[];
        initialBreakpoint?: number;
        expandToScroll?: boolean;
      };
      return {
        found: modal !== null,
        hasBreakpointsProp: modal?.breakpoints !== undefined,
        hasInitialBreakpointProp: modal?.initialBreakpoint !== undefined,
        // Ionic defaults this to `true` on ion-modal; it only has an effect when
        // breakpoints are set. Recorded here so a future default flip is noticed.
        expandToScroll: modal?.expandToScroll,
      };
    });

    // `found` guards the rest: a missing modal would make every property
    // `undefined` and pass vacuously.
    expect(config.found).toBe(true);
    // Assert the properties are absent, not merely falsy — bug 06 was "fixed" by
    // adding breakpoints, so a breakpoint configuration is now the regression.
    expect(config.hasBreakpointsProp).toBe(false);
    expect(config.hasInitialBreakpointProp).toBe(false);
  });
});
