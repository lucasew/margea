import { test, expect } from '@playwright/test';

test.describe('Unauthenticated Home Page', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure unauthenticated state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display login page directly when unauthenticated', async ({
    page,
  }) => {
    // Should show login page title "Margea"
    await expect(page.locator('h1', { hasText: 'Margea' })).toBeVisible();

    // Should show OAuth tab
    const oauthTab = page
      .locator('button[role="tab"]', { hasText: 'OAuth' })
      .or(page.locator('.tabs'));
    await expect(oauthTab.first()).toBeVisible({ timeout: 10000 });

    // Check for readOnly button elements
    const readOnlyLocator = page.locator('.btn-outline');
    await expect(readOnlyLocator.first()).toBeVisible();
  });
});
