import { chromium } from 'playwright';

(async () => {
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    console.log('Testing homepage navigation...\n');

    // Test 1: Homepage loads
    console.log('1. Testing homepage (/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await page.waitForTimeout(1000);

    const hasOwnerInput = await page.locator('input[placeholder*="facebook"]').count() > 0;
    const hasSearchButton = await page.locator('button:has-text("Buscar")').count() > 0;
    const hasTitle = await page.locator('h1:has-text("Margea")').count() > 0;

    console.log(`   Title "Margea": ${hasTitle ? '✓' : '✗'}`);
    console.log(`   Owner input field: ${hasOwnerInput ? '✓' : '✗'}`);
    console.log(`   Search button: ${hasSearchButton ? '✓' : '✗'}`);

    if (!hasTitle || !hasOwnerInput || !hasSearchButton) {
      throw new Error('Homepage elements not found!');
    }

    console.log('\n2. Testing form submission navigation...');
    await page.fill('input[placeholder*="facebook"]', 'facebook');
    await page.fill('input[placeholder*="react"]', 'react');
    await page.click('button:has-text("Buscar")');

    // Wait for navigation
    await page.waitForTimeout(1000);

    const currentUrl = page.url();
    const expectedUrl = 'http://localhost:3000/facebook/react';

    console.log(`   Current URL: ${currentUrl}`);
    console.log(`   Expected URL: ${expectedUrl}`);
    console.log(`   Navigation successful: ${currentUrl === expectedUrl ? '✓' : '✗'}`);

    if (currentUrl !== expectedUrl) {
      throw new Error(`Navigation failed! Expected ${expectedUrl}, got ${currentUrl}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✓ All homepage tests passed!');
    console.log('='.repeat(50));

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
