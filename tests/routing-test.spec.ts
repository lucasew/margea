import { test, expect } from '@playwright/test';

test.describe('Routing Tests', () => {
  test('home page loads correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');
    await expect(page.locator('h1').first()).toContainText('Margea');
  });
});
