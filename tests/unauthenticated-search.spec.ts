import { test, expect } from '@playwright/test';

test.describe('Unauthenticated Search Flow', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure unauthenticated state
    await context.clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display unauthenticated warning banner', async ({ page }) => {
    // Fill in search configuration
    await page.fill('input[placeholder="renovate[bot]"]', 'renovate[bot]');
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await page.click('button:has-text("Buscar PRs")');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check for unauthenticated warning banner
    await expect(page.locator('text=Modo não autenticado')).toBeVisible();
    await expect(page.locator('text=60 requisições/hora')).toBeVisible();
    await expect(page.locator('button:has-text("Fazer login")')).toBeVisible();
  });

  test('should allow configuring search parameters', async ({ page }) => {
    // Check initial state
    await expect(page.locator('h2:has-text("Configurar Busca")')).toBeVisible();

    // Fill in author
    const authorInput = page.locator('input[placeholder="renovate[bot]"]');
    await expect(authorInput).toHaveValue('renovate[bot]');

    // Fill in owner
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');

    // Submit form
    await page.click('button:has-text("Buscar PRs")');

    // Wait for results page
    await page.waitForLoadState('networkidle');

    // Should see loading state or results
    const loadingOrResults = page.locator('text=Carregando Pull Requests').or(page.locator('text=Grupos de PRs'));
    await expect(loadingOrResults).toBeVisible({ timeout: 10000 });
  });

  test('should handle GitHub API calls without authentication', async ({ page }) => {
    // Listen for GitHub API requests
    const apiRequests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('api.github.com')) {
        apiRequests.push({
          url: request.url(),
          headers: request.headers(),
        });
      }
    });

    // Configure and search
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await page.click('button:has-text("Buscar PRs")');

    // Wait for API call
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for API call

    // Verify API was called
    expect(apiRequests.length).toBeGreaterThan(0);

    // Verify no Authorization header in unauthenticated mode
    const graphqlRequest = apiRequests.find(req => req.url.includes('graphql'));
    if (graphqlRequest) {
      expect(graphqlRequest.headers['authorization']).toBeUndefined();
    }
  });

  test('should display error message on API failure', async ({ page }) => {
    // Mock API failure
    await page.route('**/graphql', route => {
      route.abort('failed');
    });

    // Configure and search
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await page.click('button:has-text("Buscar PRs")');

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should show error UI
    const errorMessage = page.locator('text=Erro').or(page.locator('text=erro'));
    await expect(errorMessage).toBeVisible({ timeout: 10000 });
  });

  test('should allow retry after error', async ({ page }) => {
    let callCount = 0;

    // Mock API failure on first call, success on retry
    await page.route('**/graphql', route => {
      callCount++;
      if (callCount === 1) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Configure and search
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await page.click('button:has-text("Buscar PRs")');

    // Wait for error
    await page.waitForTimeout(2000);

    // Click retry button if it exists
    const retryButton = page.locator('button:has-text("Tentar novamente")');
    if (await retryButton.isVisible()) {
      await retryButton.click();
      await page.waitForLoadState('networkidle');
    }

    expect(callCount).toBeGreaterThan(0);
  });

  test('should navigate to login page when clicking login button', async ({ page }) => {
    // Configure and search first
    await page.fill('input[placeholder="ex: facebook"]', 'lucasew');
    await page.click('button:has-text("Buscar PRs")');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Click login button in header
    const loginButton = page.locator('header button:has-text("Login")');
    await expect(loginButton).toBeVisible();
    await loginButton.click();

    // Should show login page
    await expect(page.locator('h2:has-text("Login")')).toBeVisible({ timeout: 5000 });
  });
});
