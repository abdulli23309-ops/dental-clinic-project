import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.fill("#login-email", "admin@hiradental.com");
  await page.fill("#login-password", "AdminTest123!");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/admin**", { timeout: 15000 });

  await page.click('a[href="/admin/users"]');
  await page.waitForURL("**/admin/users**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const createBtn = page.locator('button:has-text("Create Staff Account")').first();
  await createBtn.click();
  await page.waitForSelector('text=Create New Staff Account', { timeout: 5000 });
  await page.waitForTimeout(1000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "v6_admin_users_role_first_modal.png") });
  console.log("Captured v6_admin_users_role_first_modal.png successfully!");

  await browser.close();
}

main().catch(console.error);

