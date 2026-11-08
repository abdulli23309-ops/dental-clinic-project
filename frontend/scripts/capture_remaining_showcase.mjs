import { chromium } from "playwright";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Logging into Admin portal...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "admin@hiradental.com");
  await page.fill('input[type="password"]', "AdminTest123!");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/admin", { timeout: 15000 });
  await page.waitForTimeout(2000);

  // 1. Staff Accounts with Pagination
  console.log("Navigating to /admin/users...");
  await page.click('a[href="/admin/users"]');
  await page.waitForURL("**/admin/users**");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_staff_users_pagination.png"), fullPage: true });

  // 2. Settings Theming with Live Preview
  console.log("Navigating to /admin/settings...");
  await page.click('a[href="/admin/settings"]');
  await page.waitForURL("**/admin/settings**");
  await page.waitForTimeout(1500);

  const appearanceBtn = page.locator('button:has-text("Appearance & Theming")');
  if (await appearanceBtn.count() > 0) {
    await appearanceBtn.first().click();
    await page.waitForTimeout(1000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, "showcase_settings_theming_preview.png"), fullPage: true });

  console.log("Both screenshots captured successfully.");
  await browser.close();
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

