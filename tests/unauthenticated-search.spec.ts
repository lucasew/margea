import { test, expect } from '@playwright/test';
import en from '../src/locales/en.json' assert { type: 'json' };

test.describe('Unauthenticated entry', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should render the login page with OAuth access options', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Margea' })).toBeVisible();
    await expect(page.getByText(en.loginPage.subtitle)).toBeVisible();
    await expect(page.getByText(en.loginPage.chooseAccessLevel)).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(en.loginPage.readOnly) }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: new RegExp(en.loginPage.readWrite) }),
    ).toBeVisible();
  });

  test('should switch to the PAT tab', async ({ page }) => {
    await page.getByRole('tab', { name: en.loginPage.patLabel }).click();
    await expect(page.getByText(en.loginPage.enterPAT)).toBeVisible();
    await expect(
      page.getByPlaceholder(en.loginPage.patPlaceholder),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: en.loginPage.continueWithPAT }),
    ).toBeVisible();
  });
});
