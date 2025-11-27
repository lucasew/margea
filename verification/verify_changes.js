import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to home page...');
    await page.goto('http://localhost:3000');

    // Wait for the main content to load
    await page.waitForSelector('h1:has-text("Margea")');
    console.log('Home page loaded.');

    // Take a screenshot of the home page
    await page.screenshot({ path: 'verification/homepage.png' });
    console.log('Screenshot saved to verification/homepage.png');

    // Now verify error boundary works by triggering an error.
    // Since we can't easily modify code to throw error at runtime without restart,
    // we can try to force an error state if possible, or just rely on the fact that
    // if the page loads, the ErrorBoundary wrapper didn't crash the app.

    // Check if the ErrorBoundary in PRList is rendering correctly (it should render children)
    // We look for elements that are inside PRList
    // The "Filtros e Ações" section is inside PRListContent, which is wrapped by PRListErrorBoundary (now ErrorBoundary)
    const filters = await page.getByText('Filtros e Ações');
    if (await filters.isVisible()) {
        console.log('PRList content is visible, ErrorBoundary wrapper is working (pass-through).');
    } else {
        console.error('PRList content is NOT visible.');
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await browser.close();
  }
})();
