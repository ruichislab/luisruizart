from playwright.sync_api import sync_playwright, expect

def verify_archive_menu(page):
    # 1. Navigate to Archive
    print("Navigating to Archive...")
    page.goto("http://localhost:8080/archive.html")

    # 2. Verify Menu Toggle is visible (it should be on top of the canvas layers because of z-index in css/style.css)
    print("Checking for menu toggle...")
    toggle = page.locator("#menu-toggle")
    expect(toggle).to_be_visible()

    # 3. Open Menu
    print("Clicking menu toggle...")
    toggle.click()

    # 4. Verify Menu Content
    print("Verifying menu content...")
    nav = page.locator("#main-nav")
    expect(nav).to_have_class("active")

    # Check link to Nexus
    nexus_link = page.locator("text=N E X U S")
    expect(nexus_link).to_be_visible()

    # 5. Take screenshot
    page.screenshot(path="verification/archive_menu.png")
    print("Archive menu verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_archive_menu(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
