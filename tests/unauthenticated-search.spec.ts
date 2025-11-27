import { test, expect } from '@playwright/test';
import { translations } from './utils/translations';

test.describe('Unauthenticated Search Flow', () => {
  const en = translations.en.search;

  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure unauthenticated state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display login required on search button', async ({ page }) => {
    // Check for login required text on search button
    const searchButton = page.locator(`button:has-text("${en.login_required}")`);
    await expect(searchButton).toBeVisible();
    await expect(searchButton).toBeDisabled();
  });

  test('should allow filling search inputs but not searching', async ({ page }) => {
    // Fill in owner
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await expect(page.locator('input[placeholder="ex: facebook"]')).toHaveValue('lucasew');

    // Fill in repo
    await page.fill('input[placeholder="ex: react"]', 'margea');
    await expect(page.locator('input[placeholder="ex: react"]')).toHaveValue('margea');

    // Search button should be disabled
    const searchButton = page.locator(`button:has-text("${en.login_required}")`);
    await expect(searchButton).toBeDisabled();
  });

  // Since unauthenticated users can't search, API calls won't be made.
  // These tests are commented out as they're no longer valid in the current flow.
  // test('should handle GitHub API calls without authentication', async ({ page }) => { ... });
  // test('should display error message on API failure', async ({ page }) => { ... });
  // test('should allow retry after error', async ({ page }) => { ... });

  test('should navigate to login page when clicking login button in header', async ({ page }) => {
    // Click login button in header
    const loginButton = page.locator('header button:has-text("Login")');
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should show login page
    await expect(page.locator('h1:has-text("Margea")')).toBeVisible();
    await expect(page.locator(`h2:has-text("${translations.en.loginPage.chooseAccessLevel}")`)).toBeVisible({ timeout: 5000 });
  });
});
