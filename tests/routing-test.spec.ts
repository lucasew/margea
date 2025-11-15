import { test, expect } from '@playwright/test';

test.describe('Routing Tests', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1')).toContainText('Margea');
  });

  test('orgs route loads correctly on refresh', async ({ page }) => {
    await page.goto('http://localhost:3000/orgs');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that we don't get a 404
    const title = await page.title();
    expect(title).not.toContain('404');

    // Should show the app (not a 404 page)
    await expect(page.locator('body')).not.toContainText('Cannot GET /orgs');
  });

  test('org/:owner route loads correctly on refresh', async ({ page }) => {
    await page.goto('http://localhost:3000/org/facebook');

    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title).not.toContain('404');

    await expect(page.locator('body')).not.toContainText('Cannot GET');
  });

  test('/:owner/:repo route loads correctly on refresh', async ({ page }) => {
    await page.goto('http://localhost:3000/facebook/react');

    await page.waitForLoadState('networkidle');

    const title = await page.title();
    expect(title).not.toContain('404');

    await expect(page.locator('body')).not.toContainText('Cannot GET');
  });
});
