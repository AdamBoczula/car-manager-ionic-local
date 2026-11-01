// covers: docs/specs/auth/auth.md
import { test, expect } from '@playwright/test';
import {
  navigateToLogin,
  navigateToRegister,
  navigateToDashboard,
  waitForIonicPage,
} from './utils/navigation-helpers';
import { seedAuthUser, clearAuthState } from './utils/auth-helpers';
import { clearStorage } from './utils/db-helpers';

test.describe('System logowania – E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Wyczyść stan przed każdym testem
    await clearAuthState(page).catch(() => {});
    await clearStorage(page).catch(() => {});
  });

  test.describe('Strona logowania', () => {
    test('AC-1: Niezalogowany użytkownik widzi stronę logowania', async ({
      page,
    }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('🚗 Car Manager')
      ).toBeVisible();
      await expect(
        page.getByText('Zaloguj się, aby zarządzać kosztami auta')
      ).toBeVisible();
    });

    test('AC-2: Formularz logowania zawiera pola email i hasło', async ({
      page,
    }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await expect(
        page.getByPlaceholder('twoj@email.com')
      ).toBeVisible();
      await expect(
        page.getByPlaceholder('Twoje hasło')
      ).toBeVisible();
    });

    test('AC-3: Przycisk logowania jest widoczny', async ({ page }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('🔑 Zaloguj się')
      ).toBeVisible();
    });

    test('AC-4: Przycisk Google login jest widoczny', async ({ page }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('Kontynuuj z Google')
      ).toBeVisible();
    });

    test('AC-5: Link do rejestracji prowadzi na /register', async ({
      page,
    }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await page.getByText('Zarejestruj się →').click();
      await page.waitForURL('**/register');

      await expect(
        page.getByText('Utwórz konto')
      ).toBeVisible();
    });
  });

  test.describe('Strona rejestracji', () => {
    test('AC-6: Niezalogowany użytkownik widzi stronę rejestracji', async ({
      page,
    }) => {
      await navigateToRegister(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('Utwórz konto')
      ).toBeVisible();
      await expect(
        page.getByText('Zarejestruj się, aby zacząć śledzić koszty')
      ).toBeVisible();
    });

    test('AC-7: Formularz rejestracji zawiera 3 pola', async ({ page }) => {
      await navigateToRegister(page);
      await waitForIonicPage(page);

      await expect(
        page.getByPlaceholder('twoj@email.com')
      ).toBeVisible();
      await expect(
        page.getByPlaceholder('Minimum 6 znaków')
      ).toBeVisible();
      await expect(
        page.getByPlaceholder('Wpisz hasło ponownie')
      ).toBeVisible();
    });

    test('AC-8: Link do logowania prowadzi na /login', async ({ page }) => {
      await navigateToRegister(page);
      await waitForIonicPage(page);

      await page.getByText('Zaloguj się →').click();
      await page.waitForURL('**/login');

      await expect(
        page.getByText('🚗 Car Manager')
      ).toBeVisible();
    });
  });

  test.describe('Ochrona routingu', () => {
    test('AC-9: Dashboard przekierowuje niezalogowanego na /login', async ({
      page,
    }) => {
      await clearAuthState(page);
      await navigateToDashboard(page);
      await waitForIonicPage(page);

      // Powinno przekierować na login
      await expect(page).toHaveURL(/\/login/);
    });

    test('AC-10: Root przekierowuje na dashboard, potem na login', async ({
      page,
    }) => {
      await clearAuthState(page);
      await page.goto('/');
      await waitForIonicPage(page);

      // Niezalogowany → przekierowanie na /login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Stan zalogowany', () => {
    test('AC-11: Dashboard jest dostępny dla zalogowanego użytkownika', async ({
      page,
    }) => {
      // Zasiej dane użytkownika w IndexedDB
      await seedAuthUser(page, {
        uid: 'test-user-1',
        email: 'test@example.com',
        displayName: 'Test User',
      });

      await navigateToDashboard(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('Witaj!')
      ).toBeVisible();
    });

    test('AC-12: Strona logowania przekierowuje zalogowanego na dashboard', async ({
      page,
    }) => {
      await seedAuthUser(page, {
        uid: 'test-user-1',
        email: 'test@example.com',
      });

      await navigateToLogin(page);
      await waitForIonicPage(page);

      // Po zalogowaniu noAuthGuard powinien przekierować na /dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('AC-13: Strona rejestracji przekierowuje zalogowanego na dashboard', async ({
      page,
    }) => {
      await seedAuthUser(page, {
        uid: 'test-user-1',
        email: 'test@example.com',
      });

      await navigateToRegister(page);
      await waitForIonicPage(page);

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('AC-14: Na dashboardzie jest przycisk wylogowania', async ({
      page,
    }) => {
      await seedAuthUser(page, {
        uid: 'test-user-1',
        email: 'test@example.com',
      });

      await navigateToDashboard(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('Wyloguj się')
      ).toBeVisible();
    });
  });

  test.describe('Nawigacja między stronami auth', () => {
    test('AC-15: Login → Register → Login (pełny cykl nawigacji)', async ({
      page,
    }) => {
      await navigateToLogin(page);
      await waitForIonicPage(page);

      // Login → Register
      await page.getByText('Zarejestruj się →').click();
      await page.waitForURL('**/register');
      await expect(page.getByText('Utwórz konto')).toBeVisible();

      // Register → Login
      await page.getByText('Zaloguj się →').click();
      await page.waitForURL('**/login');
      await expect(page.getByText('🚗 Car Manager')).toBeVisible();
    });
  });

  test.describe('Mobile-first responsive', () => {
    test('AC-16: Strona logowania wyświetla się poprawnie na mobile', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await navigateToLogin(page);
      await waitForIonicPage(page);

      await expect(
        page.getByText('🚗 Car Manager')
      ).toBeVisible();

      // Sprawdź, że kontener nie wychodzi poza ekran
      const loginContainer = page.locator('.login-container');
      const box = await loginContainer.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(390);
      }
    });

    test('AC-17: Strona rejestracji wyświetla się poprawnie na mobile', async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await navigateToRegister(page);
      await waitForIonicPage(page);

      await expect(page.getByText('Utwórz konto')).toBeVisible();

      const registerContainer = page.locator('.register-container');
      const box = await registerContainer.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(390);
      }
    });
  });
});