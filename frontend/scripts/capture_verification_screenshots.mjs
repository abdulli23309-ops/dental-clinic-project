import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ARTIFACT_DIR = "C:/Users/Dell5420/.gemini/antigravity/brain/f837e7d0-9c58-4e07-bb24-050493a3a25b/screenshots";
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  console.log("1. Logging in as admin...");
  await page.goto("http://localhost:3000/login", { waitUntil: "domcontentloaded" });
  await page.fill("#login-email", "admin@hiradental.com");
  await page.fill("#login-password", "AdminTest123!");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/admin**", { timeout: 15000 });
  console.log("Logged in. Current URL:", page.url());
  await page.waitForTimeout(2000);

  // 1. SERVICES DRAWER
  console.log("2. Navigating to Services...");
  const servicesLink = page.locator('a[href="/admin/services"]').first();
  await servicesLink.click();
  await page.waitForURL("**/admin/services**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const editBtn = page.locator('button:has-text("Edit")').first();
  if (await editBtn.count() > 0) {
    await editBtn.click();
    await page.waitForSelector('text=Catalog Definition', { timeout: 5000 });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_services_drawer_contrast.png") });
    console.log("Captured verified_services_drawer_contrast.png");

    const closeBtn = page.locator('button[aria-label="Close drawer"]');
    if (await closeBtn.count() > 0) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 2. TEAM TAB 3
  console.log("3. Navigating to Team...");
  const teamLink = page.locator('a[href="/admin/team"]').first();
  await teamLink.click();
  await page.waitForURL("**/admin/team**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  const manageBtn = page.locator('button:has-text("Manage Clinician")').first();
  if (await manageBtn.count() > 0) {
    await manageBtn.click();
    await page.waitForTimeout(1500);

    const tab3 = page.locator('button:has-text("3. Authorized Services")').first();
    if (await tab3.count() > 0) {
      await tab3.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_team_tab3_contrast.png") });
      console.log("Captured verified_team_tab3_contrast.png");
    }
  }

  // 3. ROLES PAGINATION (LIGHT)
  console.log("4. Navigating to Roles...");
  const rolesLink = page.locator('a[href="/admin/roles"]').first();
  await rolesLink.click();
  await page.waitForURL("**/admin/roles**", { timeout: 10000 });
  await page.waitForTimeout(2000);

  await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page1_light.png") });
  console.log("Captured verified_roles_page1_light.png");

  // Click page 2 button if available
  const page2Btn = page.locator('button[aria-label="Page 2"]').first();
  if (await page2Btn.count() > 0) {
    await page2Btn.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page2_light.png") });
    console.log("Captured verified_roles_page2_light.png");
  }

  // 4. ROLES PAGINATION (DARK)
  console.log("5. Switching to dark mode on Roles...");
  const themeToggle = page.locator('button[title="Switch to dark mode"]').or(page.locator('button[title="Switch to light mode"]')).first();
  if (await themeToggle.count() > 0) {
    await themeToggle.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, "verified_roles_page_dark.png") });
    console.log("Captured verified_roles_page_dark.png");
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

main().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});

