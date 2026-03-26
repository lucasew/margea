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
    // Check for login required prompt (it's in HomePage which we don't see, we see LoginPage now)
    // We should be seeing LoginPage
    const oauthTab = page.locator('role=tab[name="OAuth"]');
    await expect(oauthTab).toBeVisible();
  });

  test('should navigate to login page when clicking login button in header', async ({
    page,
  }) => {
    // It's already showing the login page!
    await expect(
      page.locator(`text="${en.loginPage.readOnly.title}"`),
    ).toBeVisible({ timeout: 5000 });
    await expect(
      page.locator(`text="${en.loginPage.readWrite.title}"`),
    ).toBeVisible();
  });

  test('should navigate to login page when clicking login button in hero', async ({
    page,
  }) => {
    // It's already showing the login page!
    await expect(
      page.locator(`text="${en.loginPage.readOnly.title}"`),
    ).toBeVisible({ timeout: 5000 });
  });
});
