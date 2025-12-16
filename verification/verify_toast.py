
import asyncio
from playwright.async_api import async_playwright, expect

async def verify_bulk_action_toast():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()

        # Console logging
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))
        page.on("requestfailed", lambda req: print(f"REQUEST FAILED: {req.url} {req.failure}"))

        # Mock GraphQL responses
        await page.route("**/graphql", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='''
            {
              "data": {
                "viewer": {
                  "login": "testuser",
                  "avatarUrl": "https://avatars.githubusercontent.com/u/1?v=4"
                },
                "search": {
                  "nodes": [
                    {
                      "id": "PR_1",
                      "number": 1,
                      "title": "Test PR 1",
                      "body": "Body 1",
                      "state": "OPEN",
                      "createdAt": "2023-01-01T00:00:00Z",
                      "updatedAt": "2023-01-01T00:00:00Z",
                      "mergedAt": null,
                      "closedAt": null,
                      "url": "http://github.com/owner/repo/pull/1",
                      "baseRefName": "main",
                      "headRefName": "feature-1",
                      "author": { "login": "author1", "avatarUrl": "https://avatars.githubusercontent.com/u/2?v=4" },
                      "labels": { "nodes": [] },
                      "repository": {
                        "id": "REPO_1",
                        "name": "repo",
                        "nameWithOwner": "owner/repo",
                        "owner": { "login": "owner" }
                      }
                    },
                    {
                      "id": "PR_2",
                      "number": 2,
                      "title": "Test PR 2",
                      "body": "Body 2",
                      "state": "OPEN",
                      "createdAt": "2023-01-02T00:00:00Z",
                      "updatedAt": "2023-01-02T00:00:00Z",
                      "mergedAt": null,
                      "closedAt": null,
                      "url": "http://github.com/owner/repo/pull/2",
                      "baseRefName": "main",
                      "headRefName": "feature-2",
                      "author": { "login": "author2", "avatarUrl": "https://avatars.githubusercontent.com/u/3?v=4" },
                      "labels": { "nodes": [] },
                      "repository": {
                        "id": "REPO_1",
                        "name": "repo",
                        "nameWithOwner": "owner/repo",
                        "owner": { "login": "owner" }
                      }
                    }
                  ]
                }
              }
            }
            '''
        ))

        # Mock /api/auth/token
        await page.route("**/api/auth/token", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"token": "mock-token"}'
        ))

        # Mock permissions
        await page.route("**/api/auth/permissions", lambda route: route.fulfill(
             status=200,
             content_type="application/json",
             body='{"mode": "write"}'
        ))

        print("Navigating to http://localhost:3000")
        try:
            # Navigate to home
            await page.goto("http://localhost:3000", timeout=30000)

            print("Waiting for selector text=owner/repo")
            # Wait for loading
            await page.wait_for_selector("text=owner/repo", timeout=10000)

            # Click on the repository group
            await page.click("text=owner/repo")

            # Wait for PR list
            await expect(page.locator("text=Test PR 1")).to_be_visible()

            # Select all PRs
            await page.click("text=Selecionar Todos")

            # Click Merge button
            await page.click("button:has-text('Mergear 2 PRs')")

            # Wait for modal
            await expect(page.locator("text=Confirmar Mergear PRs")).to_be_visible()

            # Mock the merge mutation
            # We need to override the previous graphql mock or handle it based on request body
            # For simplicity, we can just update the mock or assume the app handles the same response gracefully
            # But the app expects "mergePullRequest" in the mutation response

            # Updating mock for mutation
            await page.route("**/graphql", lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"data": {"mergePullRequest": {"merged": true, "mergedAt": "2023-01-01T00:00:00Z"}}}'
            ))

            # Click Confirm
            await page.click("button:has-text('Mergear 2 PRs')")

            # Verify modal closes
            await expect(page.locator("text=Confirmar Mergear PRs")).not_to_be_visible()

            # Verify Toast appears
            await expect(page.locator(".toast")).to_be_visible()

            # Take screenshot of toast
            await page.screenshot(path="verification/toast_visible.png")
            print("Toast screenshot taken")

            # Click Expand button on toast (the maximize icon)
            await page.click("button[aria-label='Detalhes']")

            # Verify Global Modal appears
            await expect(page.locator("text=Mergear PRs - Progresso")).to_be_visible()

            # Take screenshot of global modal
            await page.screenshot(path="verification/global_modal.png")
            print("Global modal screenshot taken")

        except Exception as e:
            print(f"Test failed: {e}")
            await page.screenshot(path="verification/error_state.png")
            print("Error screenshot taken")
            raise e

        await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_bulk_action_toast())
