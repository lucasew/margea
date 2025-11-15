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
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions'
      ]
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    console.log('Testing navigation...\n');

    // Test 1: Homepage
    console.log('1. Testing homepage (/)...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });

    const hasOwnerInput = await page.locator('input[placeholder*="facebook"]').count() > 0;
    const hasSearchButton = await page.locator('button:has-text("Buscar")').count() > 0;
    const hasTitle = await page.locator('h1:has-text("Margea")').count() > 0;

    console.log(`   ✓ Title "Margea": ${hasTitle ? '✓' : '✗'}`);
    console.log(`   ✓ Owner input field: ${hasOwnerInput ? '✓' : '✗'}`);
    console.log(`   ✓ Search button: ${hasSearchButton ? '✓' : '✗'}\n`);

    // Test 2: /orgs route
    console.log('2. Testing /orgs route...');
    await page.goto('http://localhost:3000/orgs', { waitUntil: 'networkidle' });
    const orgsTitle = await page.locator('h1').first().textContent();
    console.log(`   ✓ Page title: "${orgsTitle}"\n`);

    // Test 3: /org/facebook route
    console.log('3. Testing /org/facebook route...');
    await page.goto('http://localhost:3000/org/facebook', { waitUntil: 'networkidle' });
    const orgTitle = await page.locator('h1').first().textContent();
    console.log(`   ✓ Page title: "${orgTitle}"\n`);

    // Test 4: /facebook/react route
    console.log('4. Testing /facebook/react route...');
    await page.goto('http://localhost:3000/facebook/react', { waitUntil: 'networkidle' });
    const repoTitle = await page.locator('h1').first().textContent();
    console.log(`   ✓ Page title: "${repoTitle}"\n`);

    // Test 5: Navigation from homepage to repository page
    console.log('5. Testing navigation from homepage...');
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.fill('input[placeholder*="facebook"]', 'facebook');
    await page.fill('input[placeholder*="react"]', 'react');
    await page.click('button:has-text("Buscar")');
    await page.waitForURL('**/facebook/react', { timeout: 5000 });

    const currentUrl = page.url();
    const expectedUrl = 'http://localhost:3000/facebook/react';
    const navigationSuccess = currentUrl === expectedUrl;

    console.log(`   ✓ Current URL: ${currentUrl}`);
    console.log(`   ✓ Expected URL: ${expectedUrl}`);
    console.log(`   ✓ Navigation successful: ${navigationSuccess ? '✓' : '✗'}\n`);

    console.log('=' .repeat(50));
    console.log('All tests completed successfully!');
    console.log('=' .repeat(50));

    await browser.close();
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    if (browser) {
      await browser.close();
    }
    process.exit(1);
  }
})();
