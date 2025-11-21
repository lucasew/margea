import time
from playwright.sync_api import sync_playwright, expect

def verify_favicon():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Go to the app
        page.goto("http://localhost:3000")

        # Wait for page to load
        time.sleep(2)

        # Get the favicon link element
        favicon = page.locator("link[rel='icon']")

        # Verify the href attribute
        expect(favicon).to_have_attribute("href", "/logo.svg")

        # Take a screenshot of the page
        page.screenshot(path="verification/app_with_favicon.png")

        print("Favicon verification passed!")

        browser.close()

if __name__ == "__main__":
    verify_favicon()
