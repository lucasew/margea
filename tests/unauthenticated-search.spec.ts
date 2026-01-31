import { test, expect } from '@playwright/test';
import { translations } from './utils/translations';

test.describe('Unauthenticated Home Page', () => {
  const en = translations.en;

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure unauthenticated state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display login prompt and buttons', async ({ page }) => {
    // Check for login required prompt
    await expect(
      page.locator(`text=${en.homepage.login_prompt}`),
    ).toBeVisible();

    // Check for Hero Login button
    const heroLoginButton = page.locator('button.btn-primary.btn-lg');
    await expect(heroLoginButton).toBeVisible();
    await expect(heroLoginButton).toHaveText(en.header.login);

    // Check for Header Login button (filtering by text to avoid matching theme toggle if it uses same class)
    const headerLoginButton = page
      .locator('header button.btn-ghost')
      .filter({ hasText: en.header.login });
    await expect(headerLoginButton).toBeVisible();
  });

  test('should navigate to login page when clicking login button in header', async ({
    page,
  }) => {
    // Click login button in header
    const loginButton = page
      .locator('header button.btn-ghost')
      .filter({ hasText: en.header.login });
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should show login page
    await expect(
      page.locator(`text=${en.loginPage.readOnly.title}`),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator(`text=${en.loginPage.readWrite.title}`),
    ).toBeVisible();
  });

  test('should navigate to login page when clicking login button in hero', async ({
    page,
  }) => {
    // Click login button in hero
    const loginButton = page.locator('button.btn-primary.btn-lg');
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should show login page
    await expect(
      page.locator(`text=${en.loginPage.readOnly.title}`),
    ).toBeVisible({ timeout: 5000 });
  });
});
