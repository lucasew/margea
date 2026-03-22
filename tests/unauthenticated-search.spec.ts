import { test, expect } from '@playwright/test';
import { translations } from './utils/translations';

test.describe('Unauthenticated Home Page', () => {
  const en = translations.en;

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure unauthenticated state
    await context.clearCookies();
    // Wait for the server and navigate
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.evaluate(() => {
      // Force language to English for tests
      localStorage.setItem('i18nextLng', 'en');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Wait for any loading spinner to disappear
    await expect(page.locator('.loading-spinner')).toHaveCount(0);
    // Wait a little extra for React components to finish rendering translations
    await page.waitForTimeout(1000);

    // Take a screenshot to debug
    await page.screenshot({ path: 'test-results/debug-home.png' });
    console.log("HTML:", await page.content());
  });

  test('should display login prompt and buttons', async ({ page }) => {
    // Check for login required prompt
    await expect(
      page.getByText('Margea', { exact: true }).first()
    ).toBeVisible({ timeout: 10000 });

    // Check for Header Login button (filtering by exact text to avoid matching theme toggle if it uses same class)
    const headerLoginButton = page
      .locator('header button.btn-ghost')
      .filter({ hasText: new RegExp(`^${en.header.login}$`) });
    await expect(headerLoginButton).toBeVisible();
  });

  test('should navigate to login page when clicking login button in header', async ({
    page,
  }) => {
    // Click login button in header
    const loginButton = page
      .locator('header button.btn-ghost')
      .filter({ hasText: new RegExp(`^${en.header.login}$`) });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should show login page
    await expect(
      page.getByText(en.loginPage.readOnly),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.getByText(en.loginPage.readWrite),
    ).toBeVisible();
  });
});
