import { test } from '@playwright/test';

test('capture homepage screenshot', async ({ page }) => {
  await page.goto('http://localhost:3000/');

  // Wait a bit for any animations
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot-homepage.png', fullPage: true });
});
