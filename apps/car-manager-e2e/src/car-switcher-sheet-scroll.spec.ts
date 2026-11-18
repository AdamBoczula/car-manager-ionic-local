// covers: docs/bugs/10-native-keyboard-integration.md
//
// Regression test for the "Dodaj auto" dialog on a phone viewport.
//
// History: the add-car dialog used to be a bottom sheet. A sheet keeps
// <ion-content> at the full wrapper height and only translates the wrapper, so
// it either left dead space under the submit button or pushed it below the fold.
// The dialog is now a self-sizing card modal: exactly as tall as the form, and
// clamped to the viewport so it stays reachable with the keyboard open.
//
// This spec deliberately drives the dialog the way a real user does on a phone:
// no programmatic breakpoint/height calls. It only taps, types and scrolls.
//
// It does NOT need the Firebase emulator — a throwaway account is created
// through the register UI.
import { test, expect, type Page } from '@playwright/test';

/** Short phone viewport — the worst case for a dialog with a submit button. */
const PHONE_VIEWPORT = { width: 390, height: 664 } as const;

/** Viewport with an Android software keyboard open (~300 px tall). */
const PHONE_WITH_KEYBOARD = { width: 390, height: 360 } as const;

test.describe('Car switcher – add-car dialog usability on a phone', () => {
  test.use({ viewport: PHONE_VIEWPORT, hasTouch: true, isMobile: true });

  /** Register a throwaway account through the UI and get past the first-car wizard. */
  async function signUpWithOneCar(page: Page): Promise<void> {
    const email = `sheet-scroll+${Date.now()}-${Math.random().toString(16).slice(2)}@carmanager.local`;
    const password = 'Password123!';

    await page.goto('/register');
    await page.locator('input[placeholder="twoj@email.com"]').fill(email);
    await page.locator('input[placeholder="Minimum 6 znaków"]').fill(password);
    await page.locator('input[placeholder="Wpisz hasło ponownie"]').fill(password);
    await page.getByRole('button', { name: /Utwórz konto/ }).click();

    // First-run wizard: the garage is empty, so /add-car is shown.
    const wizardInput = page.getByTestId('car-name-input');
    await expect(wizardInput).toBeVisible({ timeout: 20_000 });
    await wizardInput.locator('input').fill('Auto testowe');
    await wizardInput.locator('input').press('Enter');
    await expect(page.getByTestId('car-switcher-button')).toBeVisible({ timeout: 20_000 });
  }

  /** Open the "Dodaj nowe auto" dialog through the car switcher popover. */
  async function openAddCarDialog(page: Page): Promise<void> {
    await page.getByTestId('car-switcher-button').click();
    const popover = page.locator('ion-popover:visible');
    await expect(popover).toBeVisible({ timeout: 5000 });
    await popover.getByText('Dodaj auto', { exact: true }).click();
    await expect(page.getByTestId('new-car-name-input')).toBeVisible({ timeout: 5000 });
    // Let the enter transition settle so measurements are final.
    await page.waitForTimeout(600);
  }

  /** Dialog geometry (Ionic renders the wrapper and scroller in shadow DOM). */
  function dialogMetrics(page: Page) {
    return page.evaluate(() => {
      const modal = document.querySelector('ion-modal.show-modal');
      const wrapper = modal?.shadowRoot?.querySelector('.modal-wrapper') as HTMLElement | null;
      const content = modal?.querySelector('ion-content');
      const inner = content?.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null;
      const submit = modal?.querySelector('[data-testid="add-car-submit"]') as HTMLElement | null;
      const rect = (el: Element | null | undefined) => {
        if (!el) return null;
        const box = el.getBoundingClientRect();
        return { top: box.top, bottom: box.bottom, height: box.height };
      };
      return {
        viewportHeight: window.innerHeight,
        wrapper: rect(wrapper),
        scrollHeight: inner?.scrollHeight ?? 0,
        clientHeight: inner?.clientHeight ?? 0,
        submit: rect(submit),
        hasFooter: Boolean(modal?.querySelector('ion-footer')),
      };
    });
  }

  test('the add-car dialog is a self-sizing card without a pinned footer', async ({ page }) => {
    await signUpWithOneCar(page);
    await openAddCarDialog(page);

    const metrics = await dialogMetrics(page);

    // A pinned <ion-footer> takes no room from <ion-content>, so the content can
    // never scroll and the footer ends up below the fold.
    expect(metrics.hasFooter).toBe(false);

    // A sheet keeps the wrapper at 100% of the screen; the card only takes what
    // the form needs, which is what removes the dead space under the button.
    expect(metrics.wrapper).not.toBeNull();
    expect(metrics.wrapper!.height).toBeLessThan(metrics.viewportHeight - 40);
    expect(metrics.submit).not.toBeNull();

    // The form fits without scrolling: everything is visible on open.
    expect(metrics.scrollHeight).toBe(metrics.clientHeight);

    // The submit action must live inside the scrollable content, not outside it.
    const submitInContent = await page.evaluate(() => {
      const modal = document.querySelector('ion-modal.show-modal');
      const content = modal?.querySelector('ion-content');
      const submit = modal?.querySelector('[data-testid="add-car-submit"]');
      return Boolean(content && submit && content.contains(submit));
    });
    expect(submitInContent).toBe(true);
  });

  test('the submit button is fully visible and tappable as soon as the dialog opens', async ({
    page,
  }) => {
    await signUpWithOneCar(page);
    await openAddCarDialog(page);

    await page.getByTestId('new-car-name-input').locator('input').fill('Toyota Weryfikacja');

    // No scrolling and no drag: a user who just types a name and taps the
    // button must be able to finish here.
    const submit = page.getByTestId('add-car-submit');
    await expect(submit).toBeInViewport({ ratio: 1 });
    const box = await submit.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE_VIEWPORT.height);

    await submit.click({ timeout: 5000 });

    // A new car named after the input replaces the active car in the header.
    await expect(page.getByTestId('car-switcher-button')).toContainText('Toyota Weryfikacja', {
      timeout: 10_000,
    });
  });

  test('the dialog stays above the keyboard and keeps every action reachable', async ({ page }) => {
    await signUpWithOneCar(page);
    await openAddCarDialog(page);

    // Simulated Android keyboard: the viewport shrinks (adjustResize).
    await page.getByTestId('new-car-name-input').locator('input').click();
    await page.setViewportSize(PHONE_WITH_KEYBOARD);
    await page.waitForTimeout(1000);

    const metrics = await dialogMetrics(page);

    // The card is clamped to what is left of the screen instead of overflowing.
    expect(metrics.wrapper!.top).toBeGreaterThanOrEqual(0);
    expect(metrics.wrapper!.bottom).toBeLessThanOrEqual(PHONE_WITH_KEYBOARD.height);

    // The focused field is still on screen — the user sees what they type.
    await expect(page.getByTestId('new-car-name-input')).toBeInViewport({ ratio: 1 });

    // The action stays reachable by scrolling: it lives in the same content box.
    const submit = page.getByTestId('add-car-submit');
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeInViewport({ ratio: 1 });
    const box = await submit.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE_WITH_KEYBOARD.height);

    // No horizontal padding regression: fields must not hug the screen edge.
    const inputBox = await page.getByTestId('new-car-name-input').boundingBox();
    expect(inputBox!.x).toBeGreaterThan(4);
  });
});
