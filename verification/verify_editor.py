from playwright.sync_api import sync_playwright, expect

def verify_editor(page):
    # 1. Navigate to Editor
    print("Navigating to Editor...")
    page.goto("http://localhost:8080/editor.html")

    # 2. Check Tools UI
    print("Checking UI...")
    expect(page.locator("text=TOOLS")).to_be_visible()
    expect(page.locator("#btn-brush")).to_be_visible()

    # 3. Perform Drawing Action
    print("Drawing on canvas...")
    canvas = page.locator("#canvas")
    box = canvas.bounding_box()

    page.mouse.move(box['x'] + 100, box['y'] + 100)
    page.mouse.down()
    page.mouse.move(box['x'] + 200, box['y'] + 200)
    page.mouse.up()

    # 4. Apply Filter
    print("Applying Glitch Filter...")
    page.click("#btn-glitch")

    # 5. Take Screenshot (Should show drawn line + glitch artifacts)
    page.screenshot(path="verification/editor_usage.png")
    print("Editor usage verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_editor(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
