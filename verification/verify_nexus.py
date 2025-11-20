from playwright.sync_api import sync_playwright, expect

def verify_nexus(page):
    # 1. Navigate to the Nexus
    page.goto("http://localhost:8080/index.html")

    # 2. Wait for the loading overlay to disappear (class 'fade-out' added)
    # We need to wait for the #overlay to have class fade-out or be hidden
    page.wait_for_selector("#overlay.fade-out", state="attached", timeout=10000)

    # 3. Wait for the UI title to be visible
    expect(page.locator(".title")).to_be_visible()
    expect(page.locator(".title")).to_have_text("N E X U S")

    # 4. Take a screenshot of the entry point
    page.screenshot(path="verification/nexus_entry.png")

    print("Entry screenshot taken")

    # 5. Click the start prompt
    page.click("#start-prompt")

    # 6. Wait a bit for the initialization
    page.wait_for_timeout(2000)

    # 7. Take a screenshot of the active world
    page.screenshot(path="verification/nexus_world.png")
    print("World screenshot taken")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_nexus(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
