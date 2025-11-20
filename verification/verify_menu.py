from playwright.sync_api import sync_playwright, expect

def verify_navigation(page):
    # 1. Go to Index
    print("Navigating to Index...")
    page.goto("http://localhost:8080/index.html")

    # 2. Open Menu
    print("Opening Menu...")
    # Wait for menu toggle
    page.wait_for_selector("#menu-toggle", timeout=10000)
    page.click("#menu-toggle")

    # 3. Verify Menu Items are visible
    print("Verifying Menu Items...")
    page.wait_for_selector("#main-nav.active", timeout=5000)

    # Check for the new pages in the menu
    rain_link = page.get_by_text("DIGITAL RAIN")
    expect(rain_link).to_be_visible()

    # 4. Click Digital Rain
    print("Navigating to Digital Rain...")
    rain_link.click()

    # 5. Verify Digital Rain loaded
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title("DIGITAL RAIN | Net Art")
    page.screenshot(path="verification/rain_page.png")
    print("Rain page verified.")

    # 6. Open Menu again on Rain page
    print("Opening Menu on Rain page...")
    page.click("#menu-toggle")
    page.wait_for_selector("#main-nav.active", timeout=5000)

    # 7. Navigate to Glitch
    print("Navigating to Glitch...")
    page.click("text=CYBER GLITCH")
    page.wait_for_load_state("networkidle")
    expect(page).to_have_title("CYBER GLITCH | Net Art")
    page.screenshot(path="verification/glitch_page.png")
    print("Glitch page verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_navigation(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
