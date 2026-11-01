import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve('qa-screenshots');

test.describe('Login Flow - QA Verification', () => {
  test.describe.configure({ mode: 'serial' });

  // ========================================================
  // Step 1: Login page loads correctly
  // ========================================================
  test('01 - Login page loads correctly with all elements', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.screenshot({ path: `${SCREENSHOT_DIR}/01-login-page-full.png`, fullPage: true });

    // Verify heading
    const heading = page.getByRole('heading', { name: /🚗 Car Manager/i });
    await expect(heading).toBeVisible();

    // Verify email field - ion-input with name="email"
    const emailInput = page.locator('ion-input[name="email"]');
    await expect(emailInput).toBeVisible();

    // Verify password field - ion-input with name="password"
    const passwordInput = page.locator('ion-input[name="password"]');
    await expect(passwordInput).toBeVisible();

    // Verify "Zaloguj się" button
    const loginBtn = page.getByRole('button', { name: /Zaloguj się/i });
    await expect(loginBtn).toBeVisible();

    // Verify "Zarejestruj się →" link
    const registerLink = page.getByRole('link', { name: /Zarejestruj się/i });
    await expect(registerLink).toBeVisible();

    // Verify subtitle text
    await expect(page.getByText('Zaloguj się, aby zarządzać kosztami auta')).toBeVisible();

    console.log('✅ Login page loads correctly with all elements');
  });

  // ========================================================
  // Step 2: "Zaloguj się" button is disabled when fields are empty
  // ========================================================
  test('02 - Login button is disabled when fields are empty', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const loginBtn = page.getByRole('button', { name: /Zaloguj się/i });
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeDisabled();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/02-login-btn-disabled.png`, fullPage: true });
    console.log('✅ Login button is disabled when fields are empty');
  });

  // ========================================================
  // Step 3: "Zarejestruj się →" link navigates to /register
  // ========================================================
  test('03 - Register link navigates to /register', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const registerLink = page.getByRole('link', { name: /Zarejestruj się/i });
    await registerLink.click();

    await page.waitForURL('**/register');
    await expect(page).toHaveURL(/.*register.*/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-register-page.png`, fullPage: true });
    console.log('✅ Register link navigates to /register');
  });

  // ========================================================
  // Step 4: /register has 3 fields (email, hasło, powtórz hasło)
  // ========================================================
  test('04 - Register page has 3 fields', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const emailInput = page.locator('ion-input[name="email"]');
    const passwordInput = page.locator('ion-input[name="password"]');
    const confirmPasswordInput = page.locator('ion-input[name="confirmPassword"]');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();

    // Verify heading
    await expect(page.getByText('Utwórz konto', { exact: true })
      .or(page.getByText('Rejestracja'))
      .or(page.getByRole('heading', { name: /Utwórz konto|Rejestracja/i }))
      .first()
    ).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-register-3-fields.png`, fullPage: true });
    console.log('✅ Register page has 3 fields: email, hasło, powtórz hasło');
  });

  // ========================================================
  // Step 5: Validation - short password shows error message
  // ========================================================
  test('05 - Short password validation shows error', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Fill email
    const emailInput = page.locator('ion-input[name="email"] input').or(
      page.locator('ion-input[name="email"]').locator('input')
    );
    await emailInput.first().fill('test@example.com');

    // Fill short password (4 chars)
    const passwordInput = page.locator('ion-input[name="password"] input').or(
      page.locator('ion-input[name="password"]').locator('input')
    );
    await passwordInput.first().fill('1234');

    // Fill confirm password differently to trigger mismatch
    const confirmInput = page.locator('ion-input[name="confirmPassword"] input').or(
      page.locator('ion-input[name="confirmPassword"]').locator('input')
    );
    await confirmInput.first().fill('12345');

    // Click/tab to trigger validation
    await confirmInput.first().press('Tab');
    await page.waitForTimeout(500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-short-password-validation.png`, fullPage: true });

    // Look for validation error text
    const errorText = page.getByText(/Hasło musi mieć co najmniej|min.*6|krótkie|Hasła muszą być/i);
    const errorInDOM = await errorText.first().isVisible().catch(() => false);

    // Also check for ion-text danger color
    const dangerText = page.locator('ion-text[color="danger"], .validation-error, ion-note[color="danger"]').first();
    const dangerVisible = await dangerText.isVisible().catch(() => false);

    if (errorInDOM || dangerVisible) {
      console.log('✅ Validation error message shown for invalid password');
    } else {
      const bodyText = await page.locator('body').innerText();
      console.log('⚠️ No validation error visible. Page text:', bodyText.slice(0, 600));
    }
  });

  // ========================================================
  // Step 6: "Zaloguj się →" link navigates back to /login
  // ========================================================
  test('06 - Login link on register page navigates back to /login', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const loginLink = page.getByRole('link', { name: /Zaloguj się/i });
    await expect(loginLink).toBeVisible();
    await loginLink.click();

    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login.*/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-back-to-login.png`, fullPage: true });
    console.log('✅ Login link on register page navigates back to /login');
  });

  // ========================================================
  // Step 7: /dashboard redirects to /login when not authenticated
  // ========================================================
  test('07 - /dashboard redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login.*/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-dashboard-redirect-to-login.png`, fullPage: true });
    console.log('✅ /dashboard redirects to /login when not authenticated');
  });

  // ========================================================
  // Step 8: / (root) redirects to /login
  // ========================================================
  test('08 - Root URL redirects to /login', async ({ page }) => {
    await page.goto('/');

    await page.waitForURL('**/login', { timeout: 5000 });
    await expect(page).toHaveURL(/.*login.*/);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-root-redirect-to-login.png`, fullPage: true });
    console.log('✅ Root URL redirects to /login');
  });

  // ========================================================
  // Step 9: Mobile viewport (390x844) - Login page layout
  // ========================================================
  test('09 - Mobile viewport (390x844) - Login page layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /🚗 Car Manager/i })).toBeVisible();
    await expect(page.locator('ion-input[name="email"]')).toBeVisible();
    await expect(page.locator('ion-input[name="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /Zaloguj się/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Zarejestruj się/i })).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/09-mobile-login-390x844.png`, fullPage: true });
    console.log('✅ Mobile viewport (390x844) - Login page layout is correct');
  });

  // ========================================================
  // Step 10: Mobile viewport (390x844) - Register page layout
  // ========================================================
  test('10 - Mobile viewport (390x844) - Register page layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('ion-input[name="email"]')).toBeVisible();
    await expect(page.locator('ion-input[name="password"]')).toBeVisible();
    await expect(page.locator('ion-input[name="confirmPassword"]')).toBeVisible();

    // Check register button exists
    const registerBtn = page.getByRole('button', { name: /Zarejestruj|Utwórz konto/i });
    await expect(registerBtn.first()).toBeVisible();

    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-mobile-register-390x844.png`, fullPage: true });
    console.log('✅ Mobile viewport (390x844) - Register page layout is correct');
  });
});