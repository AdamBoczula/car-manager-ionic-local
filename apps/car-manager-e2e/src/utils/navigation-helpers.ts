import type { Page } from '@playwright/test';

/**
 * Navigation helpers for Car Manager e2e tests.
 *
 * Car Manager uses Ionic's router with these routes:
 *   /login      — login page
 *   /register   — registration page
 *   /dashboard  — main dashboard (requires auth)
 */

/**
 * Navigate to the login page and wait for it to be visible.
 */
export async function navigateToLogin(page: Page): Promise<void> {
  await page.goto('/login');
  await page.waitForURL('**/login');
}

/**
 * Navigate to the registration page and wait for it to be visible.
 */
export async function navigateToRegister(page: Page): Promise<void> {
  await page.goto('/register');
  await page.waitForURL('**/register');
}

/**
 * Navigate to the dashboard page and wait for it to load.
 * Requires the user to be authenticated.
 */
export async function navigateToDashboard(page: Page): Promise<void> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * Wait for an Ionic page transition to complete.
 * Ionic pages use ion-page and ion-content components.
 */
export async function waitForIonicPage(page: Page): Promise<void> {
  // Ionic 9 + Angular may not render <ion-page> as a DOM element.
  // Wait for ion-content which is always present when a page is rendered.
  await page.waitForSelector('ion-content', {
    state: 'visible',
    timeout: 10000,
  });
}

/**
 * Navigate to the refuel list by clicking the dashboard button.
 * Avoids page.goto() which triggers a full reload and loses emulator auth state.
 */
export async function navigateToRefuelListViaDashboard(page: Page): Promise<void> {
  // Wait for dashboard to be ready, then navigate programmatically.
  await page
    .locator('[data-testid="btn-add-refuel"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
    return (e2e.navigateTo as (path: string) => Promise<unknown>)('/refuel-list');
  });
  await page.waitForURL(/refuel-list/, { timeout: 10000 });
  await waitForIonicPage(page);
}

export async function navigateToRepairListViaDashboard(page: Page): Promise<void> {
  await page
    .locator('[data-testid="btn-add-repair"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
    return (e2e.navigateTo as (path: string) => Promise<unknown>)('/repair-list');
  });
  await page.waitForURL(/repair-list/, { timeout: 10000 });
  await waitForIonicPage(page);
}

export async function navigateToRefuelFormViaFAB(page: Page): Promise<void> {
  await page
    .locator('[data-testid="btn-add-refuel"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
    return (e2e.navigateTo as (path: string) => Promise<unknown>)('/refuel-form');
  });
  await page.waitForURL(/refuel-form/, { timeout: 10000 });
  await waitForIonicPage(page);
}

export async function navigateToRepairFormViaFAB(page: Page): Promise<void> {
  await page
    .locator('[data-testid="btn-add-repair"]')
    .waitFor({ state: 'visible', timeout: 15000 });
  await page.evaluate(() => {
    const e2e = (window as unknown as Record<string, unknown>).__e2e__ as Record<string, unknown>;
    return (e2e.navigateTo as (path: string) => Promise<unknown>)('/repair-form');
  });
  await page.waitForURL(/repair-form/, { timeout: 10000 });
  await waitForIonicPage(page);
}
