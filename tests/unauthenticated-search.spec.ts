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
    await page.waitForLoadState('networkidle');
  });

  test('should show login page directly when unauthenticated', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('domcontentloaded');

    // Wait for the application to be ready (i.e. loading spinner removed)
    await expect(page.locator('.loading')).toBeHidden({ timeout: 15000 });

    // The app now redirects directly to the login page when unauthenticated
    await expect(
      page.locator(`text=${en.loginPage.readOnly}`),
    ).toBeVisible({ timeout: 5000 });

    await expect(
      page.locator(`text=${en.loginPage.readWrite}`),
    ).toBeVisible();
  });
});
