from playwright.sync_api import sync_playwright, expect

def verify_portals(page):
    # 1. Navigate to Nexus
    page.goto("http://localhost:8080/index.html")

    # 2. Start Experience
    page.click("#start-prompt")
    page.wait_for_timeout(3000) # Wait for fly-in

    # 3. Check for Portal Labels (created by js/main.js)
    # We expect 5 distinct labels
    labels = page.locator(".portal-label")
    count = labels.count()
    print(f"Found {count} portal labels.")

    if count < 5:
        raise Exception(f"Expected 5 portals, found {count}")

    # 4. Verify Specific Labels exist (using specific class selector to avoid conflict with menu)
    # We iterate to check text content because .portal-label is the class for all of them
    texts = labels.all_text_contents()
    print(f"Labels found: {texts}")

    if "EDITOR" not in texts or "ARCHIVE" not in texts:
         raise Exception("Missing expected labels")

    # 5. Take Screenshot of the 3D Hub with Portals
    page.screenshot(path="verification/nexus_portals.png")
    print("Nexus portals verified.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_portals(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
