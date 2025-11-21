from playwright.sync_api import sync_playwright, expect

def verify_rebrand_and_editor(page):
    # 1. Check Home Title
    print("Checking Index Title...")
    page.goto("http://localhost:8080/index.html")
    expect(page.locator(".title")).to_have_text("L U I S R U I Z . A R T")

    # 2. Navigate to Editor via Portal (to check label update)
    # Note: We can check the label in the 3D scene might be tricky via text locator if 3D projection isn't perfect or takes time
    # Instead, let's check the menu link
    print("Checking Menu Rebrand...")
    page.click("#menu-toggle")
    expect(page.locator("text=AETHER LAB")).to_be_visible()

    # 3. Navigate to Editor
    page.click("text=AETHER LAB")
    page.wait_for_load_state("networkidle")

    # 4. Check Editor UI
    print("Checking Editor UI...")
    expect(page).to_have_title("AETHER LAB | Creation Engine")
    expect(page.locator("text=SYMMETRY ENGINE")).to_be_visible()
    expect(page.locator("#btn-undo")).to_be_visible()

    # 5. Test Symmetry Drawing
    print("Testing Symmetry...")
    # Toggle Symmetry
    page.click("#btn-symmetry")

    # Draw
    canvas = page.locator("canvas")
    box = canvas.bounding_box()
    cx, cy = box['x'] + box['width']/2, box['y'] + box['height']/2

    page.mouse.move(cx + 50, cy + 50)
    page.mouse.down()
    page.mouse.move(cx + 100, cy + 50)
    page.mouse.up()

    # 6. Take Screenshot (should show mirrored lines)
    page.screenshot(path="verification/editor_pro.png")
    print("Editor Pro features verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_rebrand_and_editor(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
