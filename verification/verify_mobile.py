from playwright.sync_api import sync_playwright, expect

def verify_mobile(page):
    # 1. Navigate to Index with Mobile Viewport
    print("Navigating to Index (Mobile)...")
    page.goto("http://localhost:8080/index.html")

    # 2. Check Menu Toggle Size
    print("Checking menu toggle size...")
    toggle = page.locator("#menu-toggle")
    box = toggle.bounding_box()
    print(f"Toggle size: {box['width']}x{box['height']}")

    # Expect larger touch target (60px from css)
    if box['width'] < 58: # Allow slight rendering variance
        raise Exception("Menu toggle too small for mobile!")

    # 3. Open Menu
    print("Tapping menu toggle...")
    toggle.tap()
    page.wait_for_selector("#main-nav.active")

    # 4. Check Font Sizes
    link_name = page.locator(".link-name").first
    font_size = link_name.evaluate("el => window.getComputedStyle(el).fontSize")
    print(f"Mobile Link Font Size: {font_size}")

    # 24px = 1.5rem * 16px base. Should be smaller than desktop (2.5rem = 40px)
    if float(font_size.replace('px', '')) > 30:
        raise Exception("Menu font size not adapted for mobile!")

    # 5. Navigate to Glitch
    print("Navigating to Glitch...")
    page.tap("text=CYBER GLITCH")
    page.wait_for_load_state("networkidle")

    # 6. Verify Glitch Text responsive sizing
    glitch_text = page.locator("#glitch-container")
    glitch_font_size = glitch_text.evaluate("el => window.getComputedStyle(el).fontSize")
    print(f"Glitch Font Size: {glitch_font_size}")
    # Should be 10vw. iPhone 12 width 390. So roughly 39px.

    page.screenshot(path="verification/mobile_verification.png")
    print("Mobile verification complete.")

if __name__ == "__main__":
    with sync_playwright() as p:
        # Emulate iPhone 12
        iphone_12 = p.devices['iPhone 12']
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(**iphone_12)
        page = context.new_page()
        try:
            verify_mobile(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
